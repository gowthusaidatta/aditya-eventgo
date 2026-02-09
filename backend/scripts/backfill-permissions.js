const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  BatchGetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { roleAllowMap } = require("../authorization");
const { buildPermissionItem } = require("../data/access");
const {
  tenantPk,
  userPk,
  userProfileSk,
  permissionSk,
} = require("../data/keys");

const { AWS_REGION, EVENTGO_MAIN_TABLE } = process.env;

if (!AWS_REGION || !EVENTGO_MAIN_TABLE) {
  console.error("Missing AWS_REGION or EVENTGO_MAIN_TABLE");
  process.exit(1);
}

const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function parseIdFromSk(sk, prefix) {
  if (!sk || typeof sk !== "string") return null;
  const token = `${prefix}#`;
  return sk.startsWith(token) ? sk.slice(token.length) : null;
}

function resolveRole(tenantUser, profile) {
  return tenantUser?.role || profile?.user_type || "student";
}

function resolveAllowedActions(role) {
  return roleAllowMap[role] || [];
}

async function batchGetItems(keys) {
  const items = [];
  for (const chunk of chunkArray(keys, 100)) {
    let requestKeys = chunk;
    while (requestKeys.length > 0) {
      const response = await ddb.send(
        new BatchGetCommand({
          RequestItems: {
            [EVENTGO_MAIN_TABLE]: {
              Keys: requestKeys,
              ConsistentRead: true,
            },
          },
        })
      );
      items.push(...(response.Responses?.[EVENTGO_MAIN_TABLE] || []));
      const unprocessed = response.UnprocessedKeys?.[EVENTGO_MAIN_TABLE]?.Keys || [];
      requestKeys = unprocessed;
    }
  }
  return items;
}

async function listTenants() {
  const tenants = [];
  let lastKey = undefined;
  do {
    const data = await ddb.send(
      new ScanCommand({
        TableName: EVENTGO_MAIN_TABLE,
        FilterExpression: "#type = :type AND SK = :sk",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":type": "tenant",
          ":sk": "META",
        },
        ExclusiveStartKey: lastKey,
      })
    );
    const items = data.Items || [];
    items.forEach((item) => {
      const tenantId = parseIdFromSk(item.PK, "TENANT");
      if (tenantId) tenants.push(tenantId);
    });
    lastKey = data.LastEvaluatedKey;
  } while (lastKey);
  return tenants;
}

async function listTenantUsers(tenantId) {
  const users = [];
  let lastKey = undefined;
  do {
    const data = await ddb.send(
      new QueryCommand({
        TableName: EVENTGO_MAIN_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": tenantPk(tenantId),
          ":sk": "USER#",
        },
        ExclusiveStartKey: lastKey,
        ConsistentRead: true,
      })
    );
    users.push(...(data.Items || []));
    lastKey = data.LastEvaluatedKey;
  } while (lastKey);
  return users;
}

async function backfillTenant(tenantId) {
  const tenantUsers = await listTenantUsers(tenantId);
  const userRecords = tenantUsers
    .map((item) => ({
      userId: parseIdFromSk(item.SK, "USER"),
      tenantUser: item,
    }))
    .filter((item) => item.userId);

  if (userRecords.length === 0) {
    return { tenantId, total: 0, created: 0, existing: 0, missingProfile: 0 };
  }

  const profileKeys = userRecords.map((record) => ({
    PK: userPk(record.userId),
    SK: userProfileSk(),
  }));
  const permissionKeys = userRecords.map((record) => ({
    PK: userPk(record.userId),
    SK: permissionSk(`TENANT#${tenantId}`),
  }));

  const profiles = await batchGetItems(profileKeys);
  const permissions = await batchGetItems(permissionKeys);

  const profileMap = new Map(profiles.map((item) => [item.PK, item]));
  const permissionSet = new Set(
    permissions.map((item) => `${item.PK}#${item.SK}`)
  );

  let created = 0;
  let existing = 0;
  let missingProfile = 0;

  for (const record of userRecords) {
    const permissionKey = `${userPk(record.userId)}#${permissionSk(`TENANT#${tenantId}`)}`;
    if (permissionSet.has(permissionKey)) {
      existing += 1;
      continue;
    }

    const profile = profileMap.get(userPk(record.userId));
    if (!profile) missingProfile += 1;

    const role = resolveRole(record.tenantUser, profile || null);
    const allowedActions = resolveAllowedActions(role);
    const now = new Date().toISOString();
    const item = buildPermissionItem(record.userId, `TENANT#${tenantId}`, {
      role,
      allowedActions,
      grantedBy: "system_backfill",
      grantedAt: now,
    });

    try {
      await ddb.send(
        new PutCommand({
          TableName: EVENTGO_MAIN_TABLE,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        })
      );
      created += 1;
    } catch (error) {
      if (error?.name === "ConditionalCheckFailedException") {
        existing += 1;
        continue;
      }
      throw error;
    }
  }

  return {
    tenantId,
    total: userRecords.length,
    created,
    existing,
    missingProfile,
  };
}

async function run() {
  const args = process.argv.slice(2);
  const tenantArg = args.find((arg) => arg.startsWith("--tenants="));
  const tenantIdArg = args.find((arg) => arg.startsWith("--tenant="));

  let tenantIds = [];
  if (tenantArg) {
    tenantIds = tenantArg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
  } else if (tenantIdArg) {
    tenantIds = tenantIdArg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
  }

  if (tenantIds.length === 0) {
    tenantIds = await listTenants();
  }

  if (tenantIds.length === 0) {
    console.warn("No tenants found for backfill");
    return;
  }

  const results = [];
  for (const tenantId of tenantIds) {
    const result = await backfillTenant(tenantId);
    results.push(result);
    console.log(JSON.stringify(result));
  }

  const summary = results.reduce(
    (acc, item) => {
      acc.total += item.total;
      acc.created += item.created;
      acc.existing += item.existing;
      acc.missingProfile += item.missingProfile;
      return acc;
    },
    { total: 0, created: 0, existing: 0, missingProfile: 0 }
  );

  console.log("Backfill summary", summary);
}

run().catch((error) => {
  console.error("Backfill failed", error?.name, error?.message);
  process.exit(1);
});
