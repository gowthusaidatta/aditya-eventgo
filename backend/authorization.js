const crypto = require("crypto");
const { QueryCommand, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { tenantPk, tenantEventSk, userPk, permissionSk } = require("./data/keys");

const roleAllowMap = {
  super_admin: ["*"],
  tenant_admin: ["*"],
  organizer: [
    "users:read",
    "events:read",
    "events:create",
    "events:update",
    "events:delete",
    "events:schedule",
    "registrations:read",
    "registrations:update",
    "registrations:delete",
    "teams:read",
    "teams:update",
    "permissions:read",
    "permissions:grant",
    "permissions:revoke",
    "submissions:read",
    "submissions:create",
    "submissions:update",
    "rubrics:read",
    "judging:read",
    "judging:write",
    "analytics:read",
    "media:presign",
    "opportunities:create",
    "opportunities:update",
    "opportunities:delete",
    "roles:read",
    "roles:update",
  ],
  coordinator: [
    "users:read",
    "events:read",
    "events:create",
    "events:update",
    "events:schedule",
    "registrations:read",
    "registrations:update",
    "teams:read",
    "teams:update",
    "submissions:read",
    "submissions:create",
    "submissions:update",
    "rubrics:read",
    "judging:read",
    "analytics:read",
    "media:presign",
    "opportunities:create",
    "opportunities:update",
  ],
  faculty: [
    "users:read",
    "events:read",
    "events:create",
    "events:update",
    "registrations:read",
    "teams:read",
    "submissions:read",
    "rubrics:read",
    "judging:read",
    "media:presign",
  ],
  volunteer: [
    "events:read",
    "registrations:read",
    "registrations:update",
    "teams:read",
    "media:presign",
  ],
  student: [
    "events:read",
    "registrations:create",
    "registrations:read",
    "teams:read",
    "teams:create",
    "teams:update",
    "media:presign",
  ],
};

function normalizeActions(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value)).filter(Boolean);
}

function mergeActions(...actionLists) {
  const merged = new Set();
  actionLists.forEach((list) => {
    normalizeActions(list).forEach((action) => merged.add(action));
  });
  return [...merged];
}

function actionAllowed(action, role, allowedActions) {
  if (allowedActions.includes("*")) return true;
  if (allowedActions.includes(action)) return true;
  const roleActions = role ? roleAllowMap[role] || [] : [];
  if (roleActions.includes("*")) return true;
  return roleActions.includes(action);
}

function createAuthorizer({ ddb, mainTable, buildAuditItem, isSuperAdminEmail, metrics }) {
  async function writeAuditLog({ req, tenantId, action, resourceType, resourceId, success }) {
    if (!mainTable || !tenantId) return;
    const actorId = req?.user?.sub || null;
    const timestamp = new Date().toISOString();
    const item = buildAuditItem(tenantId, timestamp, crypto.randomUUID(), {
      actor_id: actorId,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      success: Boolean(success),
      ip_address: req?.ip || req?.headers?.["x-forwarded-for"] || null,
    });
    await ddb.send(
      new PutCommand({
        TableName: mainTable,
        Item: item,
      })
    );
  }

  async function authorize(context, action, resource = {}) {
    const req = context?.req;
    const userId = req?.user?.sub || null;
    const tenantId = req?.user?.tenantId || null;

    if (!userId || !tenantId) {
      metrics.authDeniedTotal += 1;
      metrics.tenantMismatchTotal += 1;
      await writeAuditLog({
        req,
        tenantId: tenantId || resource?.tenantId || null,
        action,
        resourceType: resource?.type,
        resourceId: resource?.id,
        success: false,
      });
      console.warn(JSON.stringify({
        type: "auth_denied",
        reason: "missing_identity",
        userId,
        tenantId,
        action,
      }));
      if (req?.res) {
        req.res.status(403).json({ message: "Forbidden" });
      }
      return false;
    }

    if (resource?.tenantId && resource.tenantId !== tenantId) {
      metrics.authDeniedTotal += 1;
      metrics.tenantMismatchTotal += 1;
      await writeAuditLog({
        req,
        tenantId,
        action,
        resourceType: resource?.type,
        resourceId: resource?.id,
        success: false,
      });
      console.warn(JSON.stringify({
        type: "auth_denied",
        reason: "tenant_mismatch",
        userId,
        tenantId,
        resourceTenantId: resource.tenantId,
        action,
      }));
      req.res.status(403).json({ message: "Forbidden" });
      return false;
    }

    if (!mainTable) {
      metrics.authDeniedTotal += 1;
      await writeAuditLog({
        req,
        tenantId,
        action,
        resourceType: resource?.type,
        resourceId: resource?.id,
        success: false,
      });
      req.res.status(403).json({ message: "Forbidden" });
      return false;
    }

    if (isSuperAdminEmail && isSuperAdminEmail(req.user?.email)) {
      req.authContext = {
        userId,
        tenantId,
        role: "super_admin",
        permissions: [],
      };
      return true;
    }

    if (resource?.eventId && resource?.requireEventTenantCheck) {
      const eventData = await ddb.send(
        new GetCommand({
          TableName: mainTable,
          Key: { PK: tenantPk(tenantId), SK: tenantEventSk(resource.eventId) },
          ConsistentRead: true,
        })
      );
      if (!eventData.Item) {
        metrics.authDeniedTotal += 1;
        metrics.tenantMismatchTotal += 1;
        await writeAuditLog({
          req,
          tenantId,
          action,
          resourceType: "event",
          resourceId: resource.eventId,
          success: false,
        });
        req.res.status(403).json({ message: "Forbidden" });
        return false;
      }
      if (!resource.ownerId && eventData.Item.created_by) {
        resource.ownerId = eventData.Item.created_by;
      }
    }

    const authData = await ddb.send(
      new QueryCommand({
        TableName: mainTable,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": userPk(userId),
        },
        ConsistentRead: true,
      })
    );

    const items = authData.Items || [];
    const permissions = items.filter((item) => item.type === "permission");
    const globalPermission = permissions.find((item) => item.scope === "GLOBAL");
    const tenantScope = `TENANT#${tenantId}`;
    const tenantPermission = permissions.find((item) => item.scope === tenantScope);
    const eventPermission = resource?.eventId
      ? permissions.find((item) => item.scope === `EVENT#${resource.eventId}`)
      : null;

    const role = tenantPermission?.role || globalPermission?.role || null;
    const allowedActions = mergeActions(
      globalPermission?.allowedActions,
      tenantPermission?.allowedActions,
      eventPermission?.allowedActions
    );

    if (resource?.ownerId && resource?.ownerActions) {
      if (resource.ownerId === userId && resource.ownerActions.includes(action)) {
        req.authContext = { userId, tenantId, role, permissions };
        return true;
      }
    }

    if (actionAllowed(action, role, allowedActions)) {
      req.authContext = { userId, tenantId, role, permissions };
      return true;
    }

    metrics.authDeniedTotal += 1;
    await writeAuditLog({
      req,
      tenantId,
      action,
      resourceType: resource?.type,
      resourceId: resource?.id,
      success: false,
    });
    console.warn(JSON.stringify({
      type: "auth_denied",
      reason: "action_not_allowed",
      userId,
      tenantId,
      action,
    }));
    req.res.status(403).json({ message: "Forbidden" });
    return false;
  }

  return { authorize, writeAuditLog };
}

module.exports = { createAuthorizer, roleAllowMap };
