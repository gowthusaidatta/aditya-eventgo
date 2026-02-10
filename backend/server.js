const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  BatchGetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { createRemoteJWKSet, jwtVerify } = require("jose");
const { validateEventPayload } = require("./validation");
const { getRegistrationSchema, validateRegistrationFormData } = require("./eventSchemas");
const { createAuthorizer, roleAllowMap } = require("./authorization");
const {
  buildTenantUserItem,
  buildUserProfileItem,
  buildEventItem,
  buildEventConfigItem,
  buildRegistrationItem,
  buildTeamItem,
  buildTeamMemberItem,
  buildPermissionItem,
  buildAuditItem,
} = require("./data/access");
const {
  eventPk,
  eventTeamSk,
  eventRegSk,
  teamPk,
  teamMemberSk,
  tenantPk,
  tenantEventSk,
  tenantUserSk,
  userPk,
  userProfileSk,
  permissionSk,
  gsi1Pk,
} = require("./data/keys");

const app = express();

const {
  PORT = 5000,
  AWS_REGION,
  EVENTS_TABLE,
  OPPORTUNITIES_TABLE,
  USERS_TABLE,
  REGISTRATIONS_TABLE,
  TEAMS_TABLE,
  TEAM_MEMBERS_TABLE,
  ROLES_TABLE,
  USER_ROLES_TABLE,
  SCHEDULES_TABLE,
  SUBMISSIONS_TABLE,
  JUDGING_SCORES_TABLE,
  JUDGING_RUBRICS_TABLE,
  NOTIFICATIONS_TABLE,
  CERTIFICATES_TABLE,
  EVENT_PERMISSIONS_TABLE,
  PERMISSIONS_TABLE,
  EVENTGO_MAIN_TABLE,
  EVENTGO_DEFAULT_TENANT_ID,
  EVENTGO_DUAL_WRITE,
  ENABLE_LEGACY_FALLBACK,
  LEGACY_FALLBACK_DISABLED_TENANTS,
  S3_BUCKET_NAME,
  S3_PUBLIC_BASE_URL,
  COGNITO_REGION,
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  COGNITO_CLIENT_SECRET,
  CORS_ORIGINS,
  SUPER_ADMIN_EMAILS,
} = process.env;

const allowedOrigins = (CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const trafficMetrics = { total: 0, assetRequests: 0 };

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.locals.assetGuardrails = true;
app.use((req, res, next) => {
  trafficMetrics.total += 1;
  const path = req.path || "";
  const isAssetRequest =
    path.startsWith("/assets/") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|eot)$/i.test(path);
  if (isAssetRequest) {
    trafficMetrics.assetRequests += 1;
    console.warn(JSON.stringify({
      type: "asset_request_blocked",
      path,
      method: req.method,
    }));
    res.status(404).json({ message: "Static assets are not served by the API" });
    return;
  }
  next();
});
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const s3Client = new S3Client({ region: AWS_REGION });
const cognitoClient = COGNITO_REGION
  ? new CognitoIdentityProviderClient({ region: COGNITO_REGION })
  : null;

const mainTable = EVENTGO_MAIN_TABLE || null;
const defaultTenantId = EVENTGO_DEFAULT_TENANT_ID || "tenant_default";
const dualWriteMain = EVENTGO_DUAL_WRITE !== "false";
const legacyFallbackEnabled = ENABLE_LEGACY_FALLBACK === "true";
const legacyFallbackDisabledTenants = (LEGACY_FALLBACK_DISABLED_TENANTS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const legacyFallbackCounters = {};
const authMetrics = { authDeniedTotal: 0, tenantMismatchTotal: 0 };

const issuer = COGNITO_REGION && COGNITO_USER_POOL_ID
  ? `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
  : null;
const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) : null;

const superAdminEmails = (SUPER_ADMIN_EMAILS || "Datta@gmail.com")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function isSuperAdminEmail(email) {
  if (!email) return false;
  return superAdminEmails.includes(email.toLowerCase());
}

function getRoleAllowedActions(role) {
  if (!role) return [];
  return roleAllowMap[role] || [];
}

const { authorize, writeAuditLog } = createAuthorizer({
  ddb,
  mainTable,
  buildAuditItem,
  isSuperAdminEmail,
  metrics: authMetrics,
});

function getTenantIdFromPayload(payload) {
  return (
    payload?.tenant_id ||
    payload?.tenantId ||
    payload?.["custom:tenant_id"] ||
    null
  );
}

function isLegacyFallbackAllowed(tenantId) {
  if (!legacyFallbackEnabled) return false;
  if (!tenantId) return false;
  return !legacyFallbackDisabledTenants.includes(tenantId);
}

function logLegacyFallback(req, reason) {
  const tenantId = req?.tenantId || req?.user?.tenantId || defaultTenantId;
  const userId = req?.user?.sub || null;
  legacyFallbackCounters[tenantId] = (legacyFallbackCounters[tenantId] || 0) + 1;
  if (process.env.NODE_ENV === "production") {
    console.error("Legacy fallback used in production", {
      tenantId,
      userId,
      reason,
      endpoint: req?.originalUrl || req?.url,
    });
  }
  console.warn(JSON.stringify({
    type: "legacy_fallback",
    tenantId,
    userId,
    endpoint: req?.originalUrl || req?.url,
    reason,
    at: new Date().toISOString(),
  }));
}

async function verifyToken(token) {
  if (!jwks || !issuer || !COGNITO_CLIENT_ID) {
    throw new Error("Cognito configuration missing");
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
  });

  if (payload.token_use === "access") {
    if (payload.client_id !== COGNITO_CLIENT_ID) {
      throw new Error("Invalid access token client");
    }
  } else if (payload.token_use === "id") {
    if (payload.aud !== COGNITO_CLIENT_ID) {
      throw new Error("Invalid ID token audience");
    }
  } else {
    throw new Error("Invalid token use");
  }

  return payload;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ message: "Missing auth token" });
      return;
    }

    const payload = await verifyToken(token);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      tenantId: getTenantIdFromPayload(payload) || defaultTenantId,
      raw: payload,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}


function buildSecretHash(username) {
  if (!COGNITO_CLIENT_SECRET || !COGNITO_CLIENT_ID) {
    return undefined;
  }
  return crypto
    .createHmac("sha256", COGNITO_CLIENT_SECRET)
    .update(`${username}${COGNITO_CLIENT_ID}`)
    .digest("base64");
}

function normalizeCognitoUsername(value) {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function ensureCognitoConfig(res) {
  if (!cognitoClient || !COGNITO_CLIENT_ID) {
    res.status(500).json({ message: "Cognito configuration missing" });
    return false;
  }
  return true;
}

function formatCognitoError(error, fallbackMessage) {
  const code = error?.name || "CognitoError";
  const message = error?.message || fallbackMessage;
  return { code, message };
}

function buildUpdateExpression(item) {
  const keys = Object.keys(item);
  if (keys.length === 0) {
    return null;
  }

  const setExpressions = [];
  const values = {};
  const names = {};

  keys.forEach((key) => {
    setExpressions.push(`#${key} = :${key}`);
    values[`:${key}`] = item[key];
    names[`#${key}`] = key;
  });

  return {
    UpdateExpression: `SET ${setExpressions.join(", ")}`,
    ExpressionAttributeValues: values,
    ExpressionAttributeNames: names,
  };
}

function resolveTenantIdFromPayload(payload, fallback) {
  return (
    payload?.tenant_id ||
    payload?.tenantId ||
    payload?.college_id ||
    payload?.collegeId ||
    fallback
  );
}

function resolveTenantIdFromRequest(req, fallback) {
  return resolveTenantIdFromPayload(req?.query || req?.body || {}, fallback);
}

function resolveTenantIdFromProfile(profile, fallback) {
  return (
    profile?.tenant_id ||
    profile?.tenantId ||
    profile?.college_id ||
    profile?.collegeId ||
    fallback
  );
}

async function writeMainItem(item) {
  if (!mainTable || !dualWriteMain) return;
  try {
    await ddb.send(
      new PutCommand({
        TableName: mainTable,
        Item: item,
      })
    );
  } catch (error) {
    console.error("Main table write failed:", error?.name, error?.message);
  }
}

async function deleteMainItem(key) {
  if (!mainTable || !dualWriteMain) return;
  try {
    await ddb.send(
      new DeleteCommand({
        TableName: mainTable,
        Key: key,
      })
    );
  } catch (error) {
    console.error("Main table delete failed:", error?.name, error?.message);
  }
}

function parseIdFromSk(sk, prefix) {
  if (!sk || typeof sk !== "string") return null;
  const token = `${prefix}#`;
  return sk.startsWith(token) ? sk.slice(token.length) : null;
}

function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function getMainEventById(tenantId, eventId) {
  if (!mainTable) return null;
  const data = await ddb.send(
    new GetCommand({
      TableName: mainTable,
      Key: { PK: tenantPk(tenantId), SK: tenantEventSk(eventId) },
    })
  );
  if (!data.Item) return null;
  return { ...data.Item, eventId };
}

async function listMainEvents(tenantId) {
  if (!mainTable) return null;
  const data = await ddb.send(
    new QueryCommand({
      TableName: mainTable,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": tenantPk(tenantId),
        ":sk": "EVENT#",
      },
    })
  );

  return (data.Items || []).map((item) => ({
    ...item,
    eventId: parseIdFromSk(item.SK, "EVENT"),
  }));
}

async function getMainUserProfile(userId) {
  if (!mainTable) return null;
  const data = await ddb.send(
    new GetCommand({
      TableName: mainTable,
      Key: { PK: userPk(userId), SK: userProfileSk() },
    })
  );
  return data.Item || null;
}

async function listMainTenantUsers(tenantId) {
  if (!mainTable) return null;
  const data = await ddb.send(
    new QueryCommand({
      TableName: mainTable,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": tenantPk(tenantId),
        ":sk": "USER#",
      },
    })
  );
  return data.Items || [];
}

async function getTenantPermissionCoverage(tenantId) {
  if (!mainTable || !tenantId) return null;
  const tenantUsers = await listMainTenantUsers(tenantId);
  const userRecords = (tenantUsers || [])
    .map((item) => ({
      userId: parseIdFromSk(item.SK, "USER"),
      email: item.user_email || null,
      role: item.role || null,
    }))
    .filter((item) => item.userId);

  if (userRecords.length === 0) {
    return { tenantId, totalUsers: 0, missingPermissions: 0, missingUsers: [] };
  }

  const permissionKeys = userRecords.map((record) => ({
    PK: userPk(record.userId),
    SK: permissionSk(`TENANT#${tenantId}`),
  }));

  const permissionItems = [];
  for (const chunk of chunkArray(permissionKeys, 100)) {
    const batch = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [mainTable]: {
            Keys: chunk,
            ConsistentRead: true,
          },
        },
      })
    );
    const items = batch.Responses?.[mainTable] || [];
    permissionItems.push(...items);
  }

  const permissionSet = new Set(
    permissionItems.map((item) => `${item.PK}#${item.SK}`)
  );

  const missingUsers = userRecords.filter(
    (record) => !permissionSet.has(`${userPk(record.userId)}#${permissionSk(`TENANT#${tenantId}`)}`)
  );

  return {
    tenantId,
    totalUsers: userRecords.length,
    missingPermissions: missingUsers.length,
    missingUsers,
  };
}

function normalizeEmail(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveEmailByUserId(userId) {
  if (!userId) return null;
  if (!USERS_TABLE) return null;
  try {
    const data = await getUserWithFallbackKey(userId);
    const email = normalizeEmail(data.Item?.email);
    return email;
  } catch (error) {
    return null;
  }
}

const USERS_DEFAULTS = {
  full_name: "",
  email: "",
  phone: "",
  avatar_url: "",
  user_type: "student",
  college_name: "",
  graduation_year: 0,
  roll_number: "",
  branch: "",
  college_id: "",
  is_verified: false,
  college_role: "",
  permissions: [],
};

const EVENTS_DEFAULTS = {
  title: "",
  description: "",
  short_description: "",
  full_description: "",
  event_type: "",
  start_date: "",
  end_date: "",
  location: "",
  max_participants: 0,
  image_url: "",
  video_url: "",
  college_id: "",
  created_by: "",
  is_featured: false,
  mode: "offline",
  status: "draft",
  participation_type: "individual",
  difficulty_level: "Beginner",
  registration_deadline: "",
  registration_fee: 0,
  waitlist_enabled: false,
  waitlist_count: 0,
  tags: [],
  skills: [],
  venue_details: {},
  online_link: "",
  is_hackathon: false,
  team_size_min: 1,
  team_size_max: 1,
  event_config: {},
  prizes: [],
  sponsors: [],
  faqs: [],
};

const OPPORTUNITIES_DEFAULTS = {
  title: "",
  description: "",
  type: "",
  company: "",
  location: "",
  apply_url: "",
  stipend: 0,
  salary: 0,
  deadline: "",
  image_url: "",
  status: "",
  tags: [],
  created_by: "",
};

const DEFAULT_EVENT_PERMISSION_ACTIONS = [
  "events:update",
  "events:delete",
  "registrations:read",
  "registrations:update",
  "teams:read",
  "teams:update",
  "submissions:read",
  "rubrics:read",
  "judging:read",
];

const ASSET_ROOT = process.env.ASSET_ROOT || "/var/www/assets";
const FRONTEND_BUILD_ROOT = process.env.FRONTEND_BUILD_ROOT || "/var/www/frontend";
const ASSET_SIZE_LIMITS = {
  logos: 50 * 1024,
  thumbnails: 50 * 1024,
  banners: 200 * 1024,
};
const ASSET_REJECTION_LIMIT = 200;
const assetRejections = [];
let lastAssetUploadAt = null;

function getAssetCategoryFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/logos/")) return "logos";
  if (normalized.includes("/thumbnails/")) return "thumbnails";
  if (normalized.includes("/banners/")) return "banners";
  return "banners";
}

function getAssetSizeLimit(category) {
  return ASSET_SIZE_LIMITS[category] || ASSET_SIZE_LIMITS.banners;
}

async function logAssetRejection(req, reason, details = {}) {
  const entry = {
    reason,
    details,
    at: new Date().toISOString(),
  };
  assetRejections.push(entry);
  if (assetRejections.length > ASSET_REJECTION_LIMIT) {
    assetRejections.shift();
  }
  console.warn(JSON.stringify({ type: "asset_rejected", ...entry }));
  if (req?.user?.tenantId) {
    await writeAuditLog({
      req,
      tenantId: req.user.tenantId,
      action: "assets:reject",
      resourceType: "asset",
      resourceId: details?.fileName || null,
      success: false,
    });
  }
}

function listFilesRecursiveSync(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const results = [];
  entries.forEach((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursiveSync(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

async function listFilesRecursive(rootDir) {
  const results = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  await walk(rootDir);
  return results;
}

function assertAssetGuardrails() {
  if (process.env.NODE_ENV !== "production") return;
  if (!fs.existsSync(ASSET_ROOT)) {
    throw new Error("ASSET_ROOT is missing");
  }
  if (!fs.existsSync(FRONTEND_BUILD_ROOT)) {
    throw new Error("FRONTEND_BUILD_ROOT is missing");
  }
  const assetFiles = listFilesRecursiveSync(ASSET_ROOT);
  const disallowedAssets = assetFiles.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return ext !== ".webp" && ext !== ".json" && ext !== ".txt";
  });
  if (disallowedAssets.length > 0) {
    throw new Error("Non-WebP assets detected in ASSET_ROOT");
  }
  const frontendFiles = listFilesRecursiveSync(FRONTEND_BUILD_ROOT);
  const bundledImages = frontendFiles.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (filePath.replace(/\\/g, "/").includes("/icons/")) {
      return false;
    }
    return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);
  });
  if (bundledImages.length > 0) {
    throw new Error("Frontend build contains bundled images");
  }
  if (!app.locals.assetGuardrails) {
    throw new Error("Asset guardrail middleware is not initialized");
  }
}

async function getAssetHealthReport() {
  const files = await listFilesRecursive(ASSET_ROOT);
  let total = 0;
  const nonWebp = [];
  const oversize = [];
  let lastUpload = lastAssetUploadAt ? new Date(lastAssetUploadAt) : null;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const stats = await fs.promises.stat(filePath);
    total += 1;

    if (ext !== ".webp") {
      nonWebp.push(filePath);
    }

    const category = getAssetCategoryFromPath(filePath);
    const limit = getAssetSizeLimit(category);
    if (stats.size > limit) {
      oversize.push({ path: filePath, size: stats.size, limit });
    }

    if (!lastUpload || stats.mtime > lastUpload) {
      lastUpload = stats.mtime;
    }
  }

  return {
    total_assets: total,
    non_webp_assets: nonWebp,
    oversize_assets: oversize,
    last_upload_time: lastUpload ? lastUpload.toISOString() : null,
  };
}

function cloneDefault(value) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

function defaultForType(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") return {};
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  return "";
}

function applyDefaults({ incoming, defaults, existing, omitFields = [] }) {
  const merged = {
    ...(existing || {}),
    ...(incoming || {}),
  };

  const result = { ...merged };
  const omit = new Set(omitFields);
  const fields = new Set([...(defaults ? Object.keys(defaults) : []), ...Object.keys(merged)]);

  fields.forEach((field) => {
    if (omit.has(field)) return;
    const value = result[field];
    if (value === null || value === undefined) {
      if (defaults && Object.prototype.hasOwnProperty.call(defaults, field)) {
        result[field] = cloneDefault(defaults[field]);
      } else if (existing && existing[field] !== null && existing[field] !== undefined) {
        result[field] = defaultForType(existing[field]);
      } else {
        result[field] = "";
      }
    }
  });

  return result;
}

function cleanUpdateFields(fields) {
  const result = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === "string" && value.trim() === "") {
      result[key] = null;
      return;
    }
    result[key] = value;
  });
  return result;
}

const ALLOWED_USER_UPDATE_FIELDS = new Set([
  "PK",
  "SK",
  "action",
  "actor_id",
  "allowedActions",
  "completion_percent",
  "createdAt",
  "department",
  "display_name",
  "email",
  "employee_id",
  "full_name",
  "grantedAt",
  "grantedBy",
  "GSI4PK",
  "GSI4SK",
  "ip_address",
  "is_verified",
  "phone",
  "primary",
  "profile_photo_url",
  "resource_id",
  "resource_type",
  "role",
  "roll_number",
  "scope",
  "status",
  "success",
  "type",
  "updated_at",
  "updatedAt",
  "user_email",
  "user_status",
  "user_type",
  "verification_status",
  "year_of_study",
]);

function filterUserUpdateFields(payload) {
  const result = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (ALLOWED_USER_UPDATE_FIELDS.has(key)) {
      result[key] = value;
    }
  });
  return result;
}

async function updateUserWithFallbackKey({ userId, update }) {
  try {
    return await ddb.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (!isDynamoKeySchemaError(error)) {
      throw error;
    }
  }

  return await ddb.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { user_id: userId },
      ...update,
      ReturnValues: "ALL_NEW",
    })
  );
}

async function getUserWithFallbackKey(userId) {
  try {
    return await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
      })
    );
  } catch (error) {
    if (!isDynamoKeySchemaError(error)) {
      throw error;
    }
  }

  return await ddb.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { user_id: userId },
    })
  );
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generateQrCode() {
  return `REG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function isDynamoKeySchemaError(error) {
  const message = error?.message || "";
  return (
    error?.name === "ValidationException" &&
    (message.includes("provided key element") ||
      message.includes("Query condition missed key schema element") ||
      message.includes("The provided key element does not match the schema"))
  );
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin/legacy-fallback", requireAuth, async (req, res) => {
  const ok = await authorize({ req }, "admin:read", {
    tenantId: req.user?.tenantId,
    type: "admin",
    id: "legacy-fallback",
  });
  if (!ok) return;
  await writeAuditLog({
    req,
    tenantId: req.user?.tenantId || null,
    action: "admin:read",
    resourceType: "admin",
    resourceId: "legacy-fallback",
    success: true,
  });
  res.json({
    legacy_fallback_reads_total: legacyFallbackCounters,
    auth_denied_total: authMetrics.authDeniedTotal,
    tenant_mismatch_total: authMetrics.tenantMismatchTotal,
  });
});

app.get("/admin/permissions/health", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "admin:read", {
      tenantId,
      type: "admin",
      id: "permissions-health",
    });
    if (!ok) return;

    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    const report = await getTenantPermissionCoverage(tenantId);
    await writeAuditLog({
      req,
      tenantId,
      action: "admin:read",
      resourceType: "admin",
      resourceId: "permissions-health",
      success: true,
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch permissions health" });
  }
});

app.get("/admin/traffic/health", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "admin:read", {
      tenantId,
      type: "admin",
      id: "traffic-health",
    });
    if (!ok) return;

    const total = trafficMetrics.total || 0;
    const assetRequests = trafficMetrics.assetRequests || 0;
    const assetRatio = total > 0 ? assetRequests / total : 0;

    await writeAuditLog({
      req,
      tenantId,
      action: "admin:read",
      resourceType: "admin",
      resourceId: "traffic-health",
      success: true,
    });

    res.json({
      total_requests: total,
      asset_requests: assetRequests,
      asset_request_ratio: assetRatio,
      expected_asset_request_ratio_max: 0.1,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch traffic health" });
  }
});

app.get("/admin/assets/health", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "admin:read", {
      tenantId,
      type: "admin",
      id: "assets-health",
    });
    if (!ok) return;

    const report = await getAssetHealthReport();
    await writeAuditLog({
      req,
      tenantId,
      action: "admin:read",
      resourceType: "admin",
      resourceId: "assets-health",
      success: true,
    });

    res.json({
      ...report,
      recent_rejections: assetRejections,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assets health" });
  }
});

app.post("/auth/login", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }
  const normalizedUsername = normalizeCognitoUsername(username);
  const secretHash = buildSecretHash(normalizedUsername);

  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: normalizedUsername,
          PASSWORD: password,
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      })
    );

    if (response.ChallengeName) {
      res.status(400).json({
        message: "Additional challenge required",
        challengeName: response.ChallengeName,
      });
      return;
    }

    const result = response.AuthenticationResult || {};
    res.json({
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      expiresIn: result.ExpiresIn,
      tokenType: result.TokenType,
    });
  } catch (error) {
    const details = formatCognitoError(error, "Invalid credentials");
    console.error("Cognito login failed:", details.code, details.message);
    res.status(401).json({ message: details.message, code: details.code });
  }
});

app.post("/auth/refresh", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { refreshToken, username } = req.body || {};
  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }
  const normalizedUsername = normalizeCognitoUsername(username);
  if (COGNITO_CLIENT_SECRET && !normalizedUsername) {
    res.status(400).json({ message: "Username is required for token refresh" });
    return;
  }
  const secretHash = normalizedUsername ? buildSecretHash(normalizedUsername) : undefined;

  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(normalizedUsername ? { USERNAME: normalizedUsername } : {}),
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      })
    );

    const result = response.AuthenticationResult || {};
    res.json({
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      expiresIn: result.ExpiresIn,
      tokenType: result.TokenType,
    });
  } catch (error) {
    const details = formatCognitoError(error, "Failed to refresh token");
    console.error("Cognito refresh failed:", details.code, details.message);
    res.status(401).json({ message: details.message, code: details.code });
  }
});

app.post("/auth/signup", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { email, password, name, phone } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }
  const normalizedEmail = normalizeCognitoUsername(email);
  const secretHash = buildSecretHash(normalizedEmail);
  const attributes = [{ Name: "email", Value: normalizedEmail }];
  if (name) attributes.push({ Name: "name", Value: name });
  if (phone) attributes.push({ Name: "phone_number", Value: phone });

  try {
    const response = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedEmail,
        Password: password,
        UserAttributes: attributes,
        ...(secretHash ? { SecretHash: secretHash } : {}),
      })
    );

    res.json({
      userConfirmed: response.UserConfirmed,
      userSub: response.UserSub,
      codeDeliveryDetails: response.CodeDeliveryDetails,
    });
  } catch (error) {
    const details = formatCognitoError(error, "Failed to sign up");
    console.error("Cognito sign up failed:", details.code, details.message);
    res.status(400).json({ message: details.message, code: details.code });
  }
});

app.post("/auth/confirm-signup", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { username, code } = req.body || {};
  if (!username || !code) {
    res.status(400).json({ message: "Username and code are required" });
    return;
  }
  const normalizedUsername = normalizeCognitoUsername(username);
  const secretHash = buildSecretHash(normalizedUsername);

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedUsername,
        ConfirmationCode: code,
        ...(secretHash ? { SecretHash: secretHash } : {}),
      })
    );
    res.json({ success: true });
  } catch (error) {
    const details = formatCognitoError(error, "Failed to confirm sign up");
    console.error("Cognito confirm sign up failed:", details.code, details.message);
    res.status(400).json({ message: details.message, code: details.code });
  }
});

app.post("/auth/resend-confirmation", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { username } = req.body || {};
  if (!username) {
    res.status(400).json({ message: "Username is required" });
    return;
  }
  const normalizedUsername = normalizeCognitoUsername(username);
  const secretHash = buildSecretHash(normalizedUsername);

  try {
    const response = await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedUsername,
        ...(secretHash ? { SecretHash: secretHash } : {}),
      })
    );
    res.json({ codeDeliveryDetails: response.CodeDeliveryDetails });
  } catch (error) {
    const details = formatCognitoError(error, "Failed to resend confirmation");
    console.error("Cognito resend confirmation failed:", details.code, details.message);
    res.status(400).json({ message: details.message, code: details.code });
  }
});

app.post("/auth/forgot-password", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { username } = req.body || {};
  if (!username) {
    res.status(400).json({ message: "Username is required" });
    return;
  }
  const normalizedUsername = normalizeCognitoUsername(username);
  const secretHash = buildSecretHash(normalizedUsername);

  try {
    const response = await cognitoClient.send(
      new ForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedUsername,
        ...(secretHash ? { SecretHash: secretHash } : {}),
      })
    );
    res.json({ codeDeliveryDetails: response.CodeDeliveryDetails });
  } catch (error) {
    const details = formatCognitoError(error, "Failed to start password reset");
    console.error("Cognito forgot password failed:", details.code, details.message);
    res.status(400).json({ message: details.message, code: details.code });
  }
});

app.post("/auth/confirm-forgot-password", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { username, code, newPassword } = req.body || {};
  if (!username || !code || !newPassword) {
    res.status(400).json({ message: "Username, code, and new password are required" });
    return;
  }
  const normalizedUsername = normalizeCognitoUsername(username);
  const secretHash = buildSecretHash(normalizedUsername);

  try {
    await cognitoClient.send(
      new ConfirmForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedUsername,
        ConfirmationCode: code,
        Password: newPassword,
        ...(secretHash ? { SecretHash: secretHash } : {}),
      })
    );
    res.json({ success: true });
  } catch (error) {
    const details = formatCognitoError(error, "Failed to reset password");
    console.error("Cognito confirm reset failed:", details.code, details.message);
    res.status(400).json({ message: details.message, code: details.code });
  }
});

app.get("/events", async (req, res) => {
  try {
    const { type, status, featured, limit, createdBy, isHackathon } = req.query;
    const tenantId = resolveTenantIdFromRequest(req, defaultTenantId);
    const applyFilters = (items) => {
      let filtered = items || [];

      if (type) {
        filtered = filtered.filter((item) => item.event_type === type);
      }
      if (status) {
        filtered = filtered.filter((item) => item.status === status);
      }
      if (featured !== undefined) {
        const isFeatured = featured === "true";
        filtered = filtered.filter((item) => Boolean(item.is_featured) === isFeatured);
      }
      if (createdBy) {
        filtered = filtered.filter((item) => item.created_by === createdBy);
      }
      if (isHackathon !== undefined) {
        const flag = isHackathon === "true";
        filtered = filtered.filter((item) => Boolean(item.is_hackathon) === flag);
      }

      return filtered;
    };

    if (mainTable) {
      const items = await listMainEvents(tenantId);
      let filtered = applyFilters(items);

      if (isLegacyFallbackAllowed(tenantId) && EVENTS_TABLE) {
        const params = {
          TableName: EVENTS_TABLE,
          Limit: limit ? Number(limit) : undefined,
        };

        if (type || status || featured || createdBy || isHackathon !== undefined) {
          const filters = [];
          const values = {};
          const names = {};

          if (type) {
            filters.push("#event_type = :event_type");
            values[":event_type"] = type;
            names["#event_type"] = "event_type";
          }

          if (status) {
            filters.push("#status = :status");
            values[":status"] = status;
            names["#status"] = "status";
          }

          if (featured !== undefined) {
            filters.push("#is_featured = :is_featured");
            values[":is_featured"] = featured === "true";
            names["#is_featured"] = "is_featured";
          }

          if (createdBy) {
            filters.push("#created_by = :created_by");
            values[":created_by"] = createdBy;
            names["#created_by"] = "created_by";
          }

          if (isHackathon !== undefined) {
            filters.push("#is_hackathon = :is_hackathon");
            values[":is_hackathon"] = isHackathon === "true";
            names["#is_hackathon"] = "is_hackathon";
          }

          params.FilterExpression = filters.join(" AND ");
          params.ExpressionAttributeValues = values;
          params.ExpressionAttributeNames = names;
        }

        const legacyData = await ddb.send(new ScanCommand(params));
        const legacyItems = applyFilters(legacyData.Items || []);
        const merged = new Map();
        filtered.forEach((item) => merged.set(item.eventId || item.event_id, item));
        legacyItems.forEach((item) => {
          const key = item.eventId || item.event_id;
          if (key) merged.set(key, item);
        });
        filtered = Array.from(merged.values());
      }

      if (limit) {
        filtered = filtered.slice(0, Number(limit));
      }

      res.json(filtered);
      return;
    }

    if (!isLegacyFallbackAllowed(tenantId)) {
      res.status(403).json({ message: "Legacy fallback disabled" });
      return;
    }
    logLegacyFallback(req, "events_list");

    const params = {
      TableName: EVENTS_TABLE,
      Limit: limit ? Number(limit) : undefined,
    };

    if (type || status || featured || createdBy || isHackathon !== undefined) {
      const filters = [];
      const values = {};
      const names = {};

      if (type) {
        filters.push("#event_type = :event_type");
        values[":event_type"] = type;
        names["#event_type"] = "event_type";
      }

      if (status) {
        filters.push("#status = :status");
        values[":status"] = status;
        names["#status"] = "status";
      }

      if (featured !== undefined) {
        filters.push("#is_featured = :is_featured");
        values[":is_featured"] = featured === "true";
        names["#is_featured"] = "is_featured";
      }

      if (createdBy) {
        filters.push("#created_by = :created_by");
        values[":created_by"] = createdBy;
        names["#created_by"] = "created_by";
      }

      if (isHackathon !== undefined) {
        filters.push("#is_hackathon = :is_hackathon");
        values[":is_hackathon"] = isHackathon === "true";
        names["#is_hackathon"] = "is_hackathon";
      }

      params.FilterExpression = filters.join(" AND ");
      params.ExpressionAttributeValues = values;
      params.ExpressionAttributeNames = names;
    }

    const data = await ddb.send(new ScanCommand(params));
    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

app.get("/events/:eventId", async (req, res) => {
  try {
    const tenantId = resolveTenantIdFromRequest(req, defaultTenantId);
    if (mainTable) {
      const eventItem = await getMainEventById(tenantId, req.params.eventId);
      if (eventItem) {
        res.json({
          ...eventItem,
          schedule: [],
        });
        return;
      }
    }

    if (!isLegacyFallbackAllowed(tenantId)) {
      res.status(403).json({ message: "Legacy fallback disabled" });
      return;
    }
    logLegacyFallback(req, "events_detail");

    const data = await ddb.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
      })
    );
    if (!data.Item) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    let scheduleItems = [];
    if (SCHEDULES_TABLE) {
      const scheduleData = await ddb.send(
        new QueryCommand({
          TableName: SCHEDULES_TABLE,
          KeyConditionExpression: "event_id = :event_id",
          ExpressionAttributeValues: {
            ":event_id": req.params.eventId,
          },
        })
      );
      scheduleItems = scheduleData.Items || [];
    }

    res.json({
      ...data.Item,
      schedule: scheduleItems,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch event" });
  }
});

app.get("/events/:eventId/schema", async (req, res) => {
  try {
    const tenantId = resolveTenantIdFromRequest(req, defaultTenantId);
    if (mainTable) {
      const eventItem = await getMainEventById(tenantId, req.params.eventId);
      if (eventItem) {
        res.json({
          event: eventItem,
          registration_schema: getRegistrationSchema(eventItem),
        });
        return;
      }
    }

    if (!isLegacyFallbackAllowed(tenantId)) {
      res.status(403).json({ message: "Legacy fallback disabled" });
      return;
    }
    logLegacyFallback(req, "events_schema");

    const data = await ddb.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
      })
    );
    if (!data.Item) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.json({
      event: data.Item,
      registration_schema: getRegistrationSchema(data.Item),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch event schema" });
  }
});

app.post("/events", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "events:create", {
      tenantId,
      type: "event",
    });
    if (!ok) return;
    const errors = validateEventPayload(req.body || {});
    if (errors.length > 0) {
      res.status(400).json({ message: "Validation failed", errors });
      return;
    }

    const eventId = req.body.eventId || `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const normalized = applyDefaults({
      incoming: req.body,
      defaults: EVENTS_DEFAULTS,
    });

    const item = {
      ...normalized,
      eventId,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
      created_by: req.user.sub,
    };

    await ddb.send(
      new PutCommand({
        TableName: EVENTS_TABLE,
        Item: item,
      })
    );

    const configVersion = req.body.config_version || now;
    await Promise.all([
      writeMainItem(
        buildEventItem(tenantId, eventId, {
          title: item.title || null,
          short_description: item.short_description || item.description || null,
          full_description: item.full_description || null,
          event_type: item.event_type || null,
          mode: item.mode || null,
          location: item.location || null,
          start_at: item.start_date || null,
          end_at: item.end_date || null,
          registration_deadline: item.registration_deadline || null,
          banner_url: item.image_url || null,
          promo_video_url: item.video_url || null,
          visibility: item.visibility || "public",
          participation_type: item.participation_type || (item.team_size_max > 1 ? "team" : "individual"),
          tags: item.tags || [],
          skills: item.skills || [],
          difficulty_level: item.difficulty_level || null,
          status: item.status || "draft",
          created_by: item.created_by || null,
          created_at: item.createdAt || now,
          updated_at: item.updatedAt || now,
        })
      ),
      writeMainItem(
        buildEventConfigItem(eventId, configVersion, {
          event_config: item.event_config || null,
          created_at: now,
          created_by: item.created_by || null,
        })
      ),
    ]);

    await writeAuditLog({
      req,
      tenantId,
      action: "events:create",
      resourceType: "event",
      resourceId: eventId,
      success: true,
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create event" });
  }
});

app.put("/events/:eventId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "events:update", {
      tenantId,
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "event",
      id: req.params.eventId,
    });
    if (!ok) return;
    const errors = validateEventPayload(req.body || {});
    if (errors.length > 0) {
      res.status(400).json({ message: "Validation failed", errors });
      return;
    }

    const now = new Date().toISOString();
    const existing = await ddb.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
      })
    );

    const normalized = applyDefaults({
      incoming: req.body,
      defaults: EVENTS_DEFAULTS,
      existing: existing.Item,
      omitFields: ["eventId", "createdAt", "created_at", "updatedAt", "updated_at"],
    });

    const updateFields = {
      ...normalized,
      updatedAt: now,
    };

    const update = buildUpdateExpression(updateFields);
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    update.UpdateExpression = `${update.UpdateExpression}, #createdAt = if_not_exists(#createdAt, :createdAt)`;
    update.ExpressionAttributeNames["#createdAt"] = "createdAt";
    update.ExpressionAttributeValues[":createdAt"] =
      existing.Item?.createdAt || existing.Item?.created_at || now;

    const data = await ddb.send(
      new UpdateCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    const updated = data.Attributes || {};
    const configVersion = req.body.config_version || now;
    await Promise.all([
      writeMainItem(
        buildEventItem(tenantId, req.params.eventId, {
          title: updated.title || null,
          short_description: updated.short_description || updated.description || null,
          full_description: updated.full_description || null,
          event_type: updated.event_type || null,
          mode: updated.mode || null,
          location: updated.location || null,
          start_at: updated.start_date || null,
          end_at: updated.end_date || null,
          registration_deadline: updated.registration_deadline || null,
          banner_url: updated.image_url || null,
          promo_video_url: updated.video_url || null,
          visibility: updated.visibility || "public",
          participation_type: updated.participation_type || (updated.team_size_max > 1 ? "team" : "individual"),
          tags: updated.tags || [],
          skills: updated.skills || [],
          difficulty_level: updated.difficulty_level || null,
          status: updated.status || "draft",
          created_by: updated.created_by || null,
          created_at: updated.createdAt || now,
          updated_at: updated.updatedAt || now,
        })
      ),
      writeMainItem(
        buildEventConfigItem(req.params.eventId, configVersion, {
          event_config: updated.event_config || null,
          created_at: now,
          created_by: updated.created_by || null,
        })
      ),
    ]);

    await writeAuditLog({
      req,
      tenantId,
      action: "events:update",
      resourceType: "event",
      resourceId: req.params.eventId,
      success: true,
    });

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update event" });
  }
});

app.delete("/events/:eventId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "events:delete", {
      tenantId,
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "event",
      id: req.params.eventId,
    });
    if (!ok) return;
    await ddb.send(
      new DeleteCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
      })
    );
    await deleteMainItem({
      PK: tenantPk(tenantId),
      SK: tenantEventSk(req.params.eventId),
    });
    await writeAuditLog({
      req,
      tenantId,
      action: "events:delete",
      resourceType: "event",
      resourceId: req.params.eventId,
      success: true,
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event" });
  }
});

app.get("/opportunities", async (req, res) => {
  try {
    const data = await ddb.send(
      new ScanCommand({
        TableName: OPPORTUNITIES_TABLE,
      })
    );
    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch opportunities" });
  }
});

app.get("/opportunities/:oppId", async (req, res) => {
  try {
    const data = await ddb.send(
      new GetCommand({
        TableName: OPPORTUNITIES_TABLE,
        Key: { oppId: req.params.oppId },
      })
    );
    if (!data.Item) {
      res.status(404).json({ message: "Opportunity not found" });
      return;
    }
    res.json(data.Item);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch opportunity" });
  }
});

app.post("/opportunities", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "opportunities:create", {
      tenantId,
      type: "opportunity",
    });
    if (!ok) return;
    const oppId = req.body.oppId || `opp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const normalized = applyDefaults({
      incoming: req.body,
      defaults: OPPORTUNITIES_DEFAULTS,
    });

    const item = {
      ...normalized,
      oppId,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
    };

    await ddb.send(
      new PutCommand({
        TableName: OPPORTUNITIES_TABLE,
        Item: item,
      })
    );

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create opportunity" });
  }
});

app.put("/opportunities/:oppId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "opportunities:update", {
      tenantId,
      type: "opportunity",
      id: req.params.oppId,
    });
    if (!ok) return;
    const now = new Date().toISOString();
    const existing = await ddb.send(
      new GetCommand({
        TableName: OPPORTUNITIES_TABLE,
        Key: { oppId: req.params.oppId },
      })
    );

    const normalized = applyDefaults({
      incoming: req.body,
      defaults: OPPORTUNITIES_DEFAULTS,
      existing: existing.Item,
      omitFields: ["oppId", "createdAt", "created_at", "updatedAt", "updated_at"],
    });

    const updateFields = { ...normalized, updatedAt: now };
    const update = buildUpdateExpression(updateFields);
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    update.UpdateExpression = `${update.UpdateExpression}, #createdAt = if_not_exists(#createdAt, :createdAt)`;
    update.ExpressionAttributeNames["#createdAt"] = "createdAt";
    update.ExpressionAttributeValues[":createdAt"] =
      existing.Item?.createdAt || existing.Item?.created_at || now;

    const data = await ddb.send(
      new UpdateCommand({
        TableName: OPPORTUNITIES_TABLE,
        Key: { oppId: req.params.oppId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update opportunity" });
  }
});

app.delete("/opportunities/:oppId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "opportunities:delete", {
      tenantId,
      type: "opportunity",
      id: req.params.oppId,
    });
    if (!ok) return;
    await ddb.send(
      new DeleteCommand({
        TableName: OPPORTUNITIES_TABLE,
        Key: { oppId: req.params.oppId },
      })
    );
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete opportunity" });
  }
});

app.get("/users/me", requireAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const userId = req.user.sub;
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "users:read", {
      tenantId,
      ownerId: userId,
      ownerActions: ["users:read"],
      type: "user",
      id: userId,
    });
    if (!ok) return;
    const mainProfile = await getMainUserProfile(userId);
    let existing = mainProfile ? { userId, ...mainProfile } : null;
    if (!existing && mainTable) {
      const now = new Date().toISOString();
      const fallbackName = req.user.name || req.user.email || req.user.raw?.username || req.user.sub;
      const seedProfile = {
        email: req.user.email || null,
        full_name: fallbackName,
        user_type: "student",
        is_verified: false,
        createdAt: now,
        updatedAt: now,
      };
      await writeMainItem(buildUserProfileItem(userId, seedProfile));
      existing = { userId, ...seedProfile };
    }
    if (!existing && USERS_TABLE) {
      if (!isLegacyFallbackAllowed(tenantId)) {
        res.status(403).json({ message: "Legacy fallback disabled" });
        return;
      }
      logLegacyFallback(req, "users_me");
      const data = await ddb.send(
        new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId },
          ConsistentRead: true,
        })
      );
      existing = data.Item || {};
    }
    if (!existing) existing = { userId };
    const now = new Date().toISOString();
    const isSuperAdmin = isSuperAdminEmail(req.user.email);
    existing.permissions = req.authContext?.permissions || [];

    if (isSuperAdmin) {
      const updateFields = {
        user_type: "admin",
        is_verified: true,
        email: existing.email || req.user.email,
        full_name: existing.full_name || req.user.name || req.user.email,
        updatedAt: now,
        createdAt: existing.createdAt || now,
      };

      const update = buildUpdateExpression(updateFields);
      const updated = update
        ? await ddb.send(
            new UpdateCommand({
              TableName: USERS_TABLE,
              Key: { userId },
              ...update,
              ReturnValues: "ALL_NEW",
            })
          )
        : { Attributes: { ...existing, ...updateFields } };

      res.json(updated.Attributes || { userId, ...updateFields });
      return;
    }

    res.json(Object.keys(existing).length ? existing : { userId });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

app.get("/users", requireAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "users:read", {
      tenantId,
      type: "user",
    });
    if (!ok) return;
    const userType = req.query.userType ? req.query.userType.toString() : null;
    const verified = req.query.verified ? req.query.verified.toString() : null;
    const ids = (req.query.ids || "")
      .toString()
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (mainTable) {
      if (ids.length > 0) {
        const data = await ddb.send(
          new BatchGetCommand({
            RequestItems: {
              [mainTable]: {
                Keys: ids.map((id) => ({ PK: userPk(id), SK: userProfileSk() })),
              },
            },
          })
        );
        const items = data.Responses?.[mainTable] || [];
        const normalized = items.map((item) => ({
          ...item,
          userId: parseIdFromSk(item.PK, "USER"),
          user_id: parseIdFromSk(item.PK, "USER"),
        }));
        res.json(normalized);
        return;
      }

      const tenantUsers = await listMainTenantUsers(tenantId);
      const userIds = tenantUsers
        .map((item) => parseIdFromSk(item.SK, "USER"))
        .filter(Boolean);

      const profileData = userIds.length > 0
        ? await ddb.send(
            new BatchGetCommand({
              RequestItems: {
                [mainTable]: {
                  Keys: userIds.map((id) => ({ PK: userPk(id), SK: userProfileSk() })),
                },
              },
            })
          )
        : null;
      const profiles = profileData?.Responses?.[mainTable] || [];

      let items = tenantUsers.map((item) => {
        const userId = parseIdFromSk(item.SK, "USER");
        const profile = profiles.find((p) => p.PK === userPk(userId));
        const verificationStatus = profile?.verification_status || item.verification_status;
        return {
          userId,
          user_id: userId,
          full_name: profile?.full_name || item.display_name || null,
          email: profile?.email || item.user_email || null,
          phone: profile?.phone || null,
          department: profile?.department || null,
          year_of_study: profile?.year_of_study || null,
          roll_number: profile?.roll_number || null,
          employee_id: profile?.employee_id || null,
          user_type: item.role || "student",
          is_verified: verificationStatus === "verified",
          user_status: profile?.user_status || item.status || "active",
        };
      });

      if (userType) {
        items = items.filter((item) => item.user_type === userType);
      }
      if (verified === "true" || verified === "false") {
        const flag = verified === "true";
        items = items.filter((item) => Boolean(item.is_verified) === flag);
      }

      res.json(items);
      return;
    }

    if (!isLegacyFallbackAllowed(tenantId)) {
      res.status(403).json({ message: "Legacy fallback disabled" });
      return;
    }
    logLegacyFallback(req, "users_list");

    if (ids.length === 0) {
      const filters = [];
      const values = {};
      const names = {};

      if (userType) {
        filters.push("#user_type = :user_type");
        values[":user_type"] = userType;
        names["#user_type"] = "user_type";
      }

      if (verified === "true" || verified === "false") {
        filters.push("#is_verified = :is_verified");
        values[":is_verified"] = verified === "true";
        names["#is_verified"] = "is_verified";
      }

      const data = await ddb.send(
        new ScanCommand({
          TableName: USERS_TABLE,
          FilterExpression: filters.length ? filters.join(" AND ") : undefined,
          ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
          ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        })
      );

      res.json(data.Items || []);
      return;
    }

    const keys = ids.map((userId) => ({ userId }));
    const data = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [USERS_TABLE]: {
            Keys: keys,
          },
        },
      })
    );
    let items = data.Responses?.[USERS_TABLE] || [];
    if (items.length === 0 && ids.length > 0) {
      const filters = [];
      const values = {};
      ids.forEach((id, index) => {
        const token = `:id${index}`;
        filters.push(`userId = ${token} OR user_id = ${token}`);
        values[token] = id;
      });

      const scanData = await ddb.send(
        new ScanCommand({
          TableName: USERS_TABLE,
          FilterExpression: filters.join(" OR "),
          ExpressionAttributeValues: values,
        })
      );
      items = scanData.Items || [];
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.put("/users/:userId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "users:update", {
      tenantId,
      type: "user",
      id: req.params.userId,
    });
    if (!ok) return;
    const now = new Date().toISOString();
    const updatePayload = filterUserUpdateFields(req.body);

    const updateFields = cleanUpdateFields({
      ...updatePayload,
      updatedAt: now,
    });

    const update = buildUpdateExpression(updateFields);
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    update.UpdateExpression = `${update.UpdateExpression}, #createdAt = if_not_exists(#createdAt, :createdAt)`;
    update.ExpressionAttributeNames["#createdAt"] = "createdAt";
    const existing = await getUserWithFallbackKey(req.params.userId);
    update.ExpressionAttributeValues[":createdAt"] =
      existing.Item?.createdAt || existing.Item?.created_at || now;

    const data = await updateUserWithFallbackKey({
      userId: req.params.userId,
      update,
    });

    const updatedProfile = data.Attributes || { userId: req.params.userId, ...updateFields };
    const role = updatedProfile.user_type || "student";
    await Promise.all([
      writeMainItem(
        buildUserProfileItem(req.params.userId, {
          full_name: updatedProfile.full_name || null,
          email: updatedProfile.email || null,
          phone: updatedProfile.phone || null,
          department: updatedProfile.department || null,
          year_of_study: updatedProfile.year_of_study || null,
          roll_number: updatedProfile.roll_number || null,
          employee_id: updatedProfile.employee_id || null,
          profile_photo_url: updatedProfile.avatar_url || null,
          completion_percent: updatedProfile.completion_percent || null,
          verification_status: updatedProfile.is_verified ? "verified" : "pending",
          user_status: updatedProfile.user_status || "active",
          updated_at: now,
        })
      ),
      writeMainItem(
        buildTenantUserItem(tenantId, req.params.userId, {
          role,
          status: updatedProfile.user_status || "active",
          primary: true,
          user_email: updatedProfile.email || null,
          display_name: updatedProfile.full_name || null,
          updated_at: now,
        })
      ),
      writeMainItem(
        buildPermissionItem(req.params.userId, `TENANT#${tenantId}`, {
          role,
          allowedActions: getRoleAllowedActions(role),
          grantedBy: req.user.sub,
          grantedAt: now,
        })
      ),
    ]);

    if (existing.Item?.user_type && existing.Item.user_type !== role) {
      await writeAuditLog({
        req,
        tenantId,
        action: "roles:update",
        resourceType: "user",
        resourceId: req.params.userId,
        success: true,
      });
    }

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update user" });
  }
});

app.delete("/users/:userId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "users:delete", {
      tenantId,
      type: "user",
      id: req.params.userId,
    });
    if (!ok) return;
    const target = await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: req.params.userId },
      })
    );

    if (isSuperAdminEmail(target.Item?.email)) {
      res.status(403).json({ message: "Super admin accounts cannot be deleted" });
      return;
    }

    await ddb.send(
      new DeleteCommand({
        TableName: USERS_TABLE,
        Key: { userId: req.params.userId },
      })
    );
    await writeAuditLog({
      req,
      tenantId,
      action: "users:delete",
      resourceType: "user",
      resourceId: req.params.userId,
      success: true,
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

app.put("/users/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "users:update", {
      tenantId,
      ownerId: userId,
      ownerActions: ["users:update"],
      type: "user",
      id: userId,
    });
    if (!ok) return;
    const now = new Date().toISOString();
    const isSuperAdmin = isSuperAdminEmail(req.user.email);
    const updatePayload = filterUserUpdateFields(req.body);

    const updateFields = cleanUpdateFields({
      ...updatePayload,
      updatedAt: now,
    });

    if (isSuperAdmin) {
      updateFields.user_type = "admin";
      updateFields.is_verified = true;
      updateFields.email = req.user.email;
      updateFields.full_name = updateFields.full_name || req.user.name || req.user.email;
    }

    const update = buildUpdateExpression(updateFields);
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    update.UpdateExpression = `${update.UpdateExpression}, #createdAt = if_not_exists(#createdAt, :createdAt)`;
    update.ExpressionAttributeNames["#createdAt"] = "createdAt";
    const existing = await getUserWithFallbackKey(userId);
    update.ExpressionAttributeValues[":createdAt"] =
      existing.Item?.createdAt || existing.Item?.created_at || req.body?.createdAt || now;

    const data = await updateUserWithFallbackKey({ userId, update });
    const updatedProfile = data.Attributes || { userId, ...updateFields };
    const role = updatedProfile.user_type || "student";
    await Promise.all([
      writeMainItem(
        buildUserProfileItem(userId, {
          full_name: updatedProfile.full_name || null,
          email: updatedProfile.email || null,
          phone: updatedProfile.phone || null,
          department: updatedProfile.department || null,
          year_of_study: updatedProfile.year_of_study || null,
          roll_number: updatedProfile.roll_number || null,
          employee_id: updatedProfile.employee_id || null,
          profile_photo_url: updatedProfile.avatar_url || null,
          completion_percent: updatedProfile.completion_percent || null,
          verification_status: updatedProfile.is_verified ? "verified" : "pending",
          user_status: updatedProfile.user_status || "active",
          updated_at: now,
        })
      ),
      writeMainItem(
        buildTenantUserItem(tenantId, userId, {
          role,
          status: updatedProfile.user_status || "active",
          primary: true,
          user_email: updatedProfile.email || null,
          display_name: updatedProfile.full_name || null,
          updated_at: now,
        })
      ),
      writeMainItem(
        buildPermissionItem(userId, `TENANT#${tenantId}`, {
          role,
          allowedActions: getRoleAllowedActions(role),
          grantedBy: userId,
          grantedAt: now,
        })
      ),
    ]);
    res.json(data.Attributes || {});
  } catch (error) {
    console.error("Update profile failed:", error?.name || "Error", error?.message || error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
});

app.post("/registrations", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const tenantId = req.user?.tenantId || null;
    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const ok = await authorize({ req }, "registrations:create", {
      tenantId,
      ownerId: userId,
      ownerActions: ["registrations:create"],
      eventId,
      requireEventTenantCheck: true,
      type: "registration",
      id: eventId,
    });
    if (!ok) return;

    let eventData = null;
    if (mainTable) {
      const mainEvent = await getMainEventById(tenantId, eventId);
      eventData = { Item: mainEvent };
    } else {
      if (!isLegacyFallbackAllowed(tenantId)) {
        res.status(403).json({ message: "Legacy fallback disabled" });
        return;
      }
      logLegacyFallback(req, "registrations_event_lookup");
      eventData = await ddb.send(
        new GetCommand({
          TableName: EVENTS_TABLE,
          Key: { eventId },
        })
      );
    }
    if (!eventData.Item) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (eventData.Item.registration_deadline) {
      const deadline = new Date(eventData.Item.registration_deadline);
      if (!Number.isNaN(deadline.getTime()) && deadline < new Date()) {
        res.status(400).json({ message: "Registration deadline has passed" });
        return;
      }
    }

    let registrantProfile = null;
    if (USERS_TABLE) {
      const existingProfile = await ddb.send(
        new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId },
        })
      );

      if (existingProfile.Item) {
        registrantProfile = existingProfile.Item;
      } else if (req.user?.email) {
        const now = new Date().toISOString();
        const minimalProfile = {
          userId,
          email: req.user.email,
          full_name: req.user.name || req.user.email,
          user_type: "student",
          is_verified: true,
          createdAt: now,
          updatedAt: now,
        };
        await ddb.send(
          new PutCommand({
            TableName: USERS_TABLE,
            Item: minimalProfile,
          })
        );
        registrantProfile = minimalProfile;
      }
    }

    const formData = req.body?.form_data && typeof req.body.form_data === "object"
      ? req.body.form_data
      : {
          full_name: req.body.full_name,
          roll_number: req.body.roll_number,
          college_name: req.body.college_name,
          branch: req.body.branch,
          email: req.body.email,
          phone: req.body.phone,
        };

    const validationErrors = validateRegistrationFormData(eventData.Item, formData);
    if (validationErrors.length > 0) {
      res.status(400).json({ message: "Validation failed", errors: validationErrors });
      return;
    }

    const participationType = eventData.Item.participation_type
      || (eventData.Item.team_size_max && eventData.Item.team_size_max > 1 ? "team" : "individual");
    if (participationType === "team") {
      const teamName = String(formData.team_name || "").trim();
      if (!teamName) {
        res.status(400).json({ message: "Validation failed", errors: ["Team Name is required"] });
        return;
      }

      const membersRaw = formData.team_members;
      let members = [];
      if (Array.isArray(membersRaw)) {
        members = membersRaw.map((value) => String(value).trim()).filter(Boolean);
      } else if (membersRaw) {
        members = String(membersRaw)
          .split(/[\n,]+/)
          .map((value) => value.trim())
          .filter(Boolean);
      }

      const minSize = Number(eventData.Item.team_size_min || 1);
      const maxSize = Number(eventData.Item.team_size_max || Math.max(minSize, 1));
      const totalMembers = 1 + members.length;

      if (Number.isFinite(minSize) && totalMembers < minSize) {
        res.status(400).json({
          message: "Validation failed",
          errors: [`Team must have at least ${minSize} members`],
        });
        return;
      }

      if (Number.isFinite(maxSize) && totalMembers > maxSize) {
        res.status(400).json({
          message: "Validation failed",
          errors: [`Team must have at most ${maxSize} members`],
        });
        return;
      }

      const invalidEmails = members.filter(
        (entry) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry)
      );
      if (invalidEmails.length > 0) {
        res.status(400).json({
          message: "Validation failed",
          errors: ["Team member emails are invalid"],
        });
        return;
      }
    }

    const item = {
      event_id: eventId,
      user_id: userId,
      qr_code: req.body.qr_code || generateQrCode(),
      registration_status: req.body.registration_status || "confirmed",
      registered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      form_data: formData,
      team_data: req.body?.team_data || null,
      registrant: registrantProfile
        ? {
            full_name: registrantProfile.full_name || null,
            email: registrantProfile.email || null,
            college_name: registrantProfile.college_name || null,
            college_id: registrantProfile.college_id || null,
            roll_number: registrantProfile.roll_number || null,
            branch: registrantProfile.branch || null,
            phone: registrantProfile.phone || null,
          }
        : null,
    };

    await ddb.send(
      new PutCommand({
        TableName: REGISTRATIONS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(event_id) AND attribute_not_exists(user_id)",
      })
    );

    await writeMainItem(
      buildRegistrationItem(eventId, userId, {
        tenant_id: tenantId,
        status: item.registration_status,
        form_data: item.form_data,
        team_data: item.team_data,
        created_at: item.created_at,
      })
    );

    await writeAuditLog({
      req,
      tenantId,
      action: "registrations:create",
      resourceType: "event",
      resourceId: eventId,
      success: true,
    });

    res.status(201).json(item);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      res.status(409).json({ message: "Already registered" });
      return;
    }
    res.status(500).json({ message: "Failed to register" });
  }
});

app.get("/registrations", requireAuth, async (req, res) => {
  try {
    const { eventId, all } = req.query;
    const userId = req.user.sub;
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "registrations:read", {
      tenantId,
      ownerId: userId,
      ownerActions: ["registrations:read"],
      eventId: eventId ? String(eventId) : null,
      requireEventTenantCheck: Boolean(eventId),
      type: "registration",
      id: eventId ? String(eventId) : userId,
    });
    if (!ok) return;

    if (mainTable) {
      if (eventId) {
        if (all === "true") {
          const data = await ddb.send(
            new QueryCommand({
              TableName: mainTable,
              KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
              ExpressionAttributeValues: {
                ":pk": eventPk(eventId),
                ":sk": "REG#USER#",
              },
            })
          );
          const items = (data.Items || []).map((item) => ({
            ...item,
            event_id: eventId,
            user_id: parseIdFromSk(item.SK, "REG#USER"),
            registration_status: item.status || item.registration_status,
            registered_at: item.created_at || item.registered_at,
          }));
          res.json(items);
          return;
        }

        const data = await ddb.send(
          new GetCommand({
            TableName: mainTable,
            Key: {
              PK: eventPk(eventId),
              SK: eventRegSk(userId),
            },
          })
        );
        res.json(data.Item ? [data.Item] : []);
        return;
      }

      const data = await ddb.send(
        new QueryCommand({
          TableName: mainTable,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": gsi1Pk(userId),
            ":sk": "EVENT#",
          },
        })
      );
      res.json(data.Items || []);
      return;
    }

    if (!isLegacyFallbackAllowed(tenantId)) {
      res.status(403).json({ message: "Legacy fallback disabled" });
      return;
    }
    logLegacyFallback(req, "registrations_list");

    if (eventId) {
      if (all === "true") {
        try {
          const data = await ddb.send(
            new QueryCommand({
              TableName: REGISTRATIONS_TABLE,
              KeyConditionExpression: "event_id = :event_id",
              ExpressionAttributeValues: {
                ":event_id": eventId,
              },
            })
          );
          const items = data.Items || [];
          if (!USERS_TABLE || items.length === 0) {
            res.json(items);
            return;
          }

          const userIds = [...new Set(items.map((item) => item.user_id).filter(Boolean))];
          const userData = userIds.length > 0
            ? await ddb.send(
                new BatchGetCommand({
                  RequestItems: {
                    [USERS_TABLE]: {
                      Keys: userIds.map((id) => ({ userId: id })),
                    },
                  },
                })
              )
            : null;
          const users = (userData?.Responses?.[USERS_TABLE] || []).map((item) => ({
            ...item,
            userId: item.userId || item.user_id,
          }));
          const enriched = items.map((item) => {
            const profile = users.find((u) => u.userId === item.user_id);
            if (item.registrant) return item;
            if (profile) {
              return {
                ...item,
                registrant: {
                  full_name: profile.full_name || null,
                  email: profile.email || null,
                  college_name: profile.college_name || null,
                  college_id: profile.college_id || null,
                  roll_number: profile.roll_number || null,
                  branch: profile.branch || null,
                  phone: profile.phone || null,
                },
              };
            }
            return {
              ...item,
              registrant: {
                full_name: item.full_name || null,
                email: item.email || null,
                college_name: item.college_name || null,
                college_id: item.college_id || null,
                roll_number: item.roll_number || null,
                branch: item.branch || null,
                phone: item.phone || null,
              },
            };
          });
          res.json(enriched);
          return;
        } catch (error) {
          if (!isDynamoKeySchemaError(error)) {
            console.error("Registrations query by event_id failed:", error?.name, error?.message);
            res.status(500).json({ message: "Failed to fetch registrations" });
            return;
          }
        }

        const scanData = await ddb.send(
          new ScanCommand({
            TableName: REGISTRATIONS_TABLE,
            FilterExpression: "event_id = :event_id",
            ExpressionAttributeValues: { ":event_id": eventId },
          })
        );
        res.json(scanData.Items || []);
        return;
      }

      try {
        const data = await ddb.send(
          new QueryCommand({
            TableName: REGISTRATIONS_TABLE,
            KeyConditionExpression: "event_id = :event_id AND user_id = :user_id",
            ExpressionAttributeValues: {
              ":event_id": eventId,
              ":user_id": userId,
            },
          })
        );
        res.json(data.Items || []);
        return;
      } catch (error) {
        if (!isDynamoKeySchemaError(error)) {
          console.error("Registrations query by event_id/user_id failed:", error?.name, error?.message);
          res.status(500).json({ message: "Failed to fetch registrations" });
          return;
        }
      }

      try {
        const data = await ddb.send(
          new QueryCommand({
            TableName: REGISTRATIONS_TABLE,
            KeyConditionExpression: "user_id = :user_id",
            FilterExpression: "event_id = :event_id",
            ExpressionAttributeValues: {
              ":event_id": eventId,
              ":user_id": userId,
            },
          })
        );
        res.json(data.Items || []);
        return;
      } catch (error) {
        if (!isDynamoKeySchemaError(error)) {
          console.error("Registrations query by user_id failed:", error?.name, error?.message);
          res.status(500).json({ message: "Failed to fetch registrations" });
          return;
        }
      }

      const scanData = await ddb.send(
        new ScanCommand({
          TableName: REGISTRATIONS_TABLE,
          FilterExpression: "event_id = :event_id AND user_id = :user_id",
          ExpressionAttributeValues: {
            ":event_id": eventId,
            ":user_id": userId,
          },
        })
      );
      res.json(scanData.Items || []);
      return;
    }

    try {
      const data = await ddb.send(
        new QueryCommand({
          TableName: REGISTRATIONS_TABLE,
          KeyConditionExpression: "user_id = :user_id",
          ExpressionAttributeValues: { ":user_id": userId },
        })
      );
      res.json(data.Items || []);
      return;
    } catch (error) {
      if (!isDynamoKeySchemaError(error)) {
        console.error("Registrations query by user_id failed:", error?.name, error?.message);
        res.status(500).json({ message: "Failed to fetch registrations" });
        return;
      }
    }

    const scanData = await ddb.send(
      new ScanCommand({
        TableName: REGISTRATIONS_TABLE,
        FilterExpression: "user_id = :user_id",
        ExpressionAttributeValues: { ":user_id": userId },
      })
    );

    res.json(scanData.Items || []);
  } catch (error) {
    console.error("Registrations handler failed:", error?.name, error?.message);
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
});

app.get("/registrations/all", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "registrations:read", {
      tenantId,
      type: "registration",
      id: "all",
    });
    if (!ok) return;
    if (mainTable) {
      res.status(403).json({ message: "Unscoped registrations are not permitted" });
      return;
    }
    const { startDate, endDate } = req.query;
    const filters = [];
    const values = {};

    if (startDate) {
      filters.push("(registered_at >= :startDate OR createdAt >= :startDate)");
      values[":startDate"] = startDate;
    }
    if (endDate) {
      filters.push("(registered_at <= :endDate OR createdAt <= :endDate)");
      values[":endDate"] = endDate;
    }

    const data = await ddb.send(
      new ScanCommand({
        TableName: REGISTRATIONS_TABLE,
        FilterExpression: filters.length ? filters.join(" AND ") : undefined,
        ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
});

app.delete("/registrations/:eventId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "registrations:delete", {
      tenantId,
      ownerId: req.user.sub,
      ownerActions: ["registrations:delete"],
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "registration",
      id: req.params.eventId,
    });
    if (!ok) return;
    await ddb.send(
      new DeleteCommand({
        TableName: REGISTRATIONS_TABLE,
        Key: { event_id: req.params.eventId, user_id: req.user.sub },
      })
    );
    await writeAuditLog({
      req,
      tenantId,
      action: "registrations:delete",
      resourceType: "event",
      resourceId: req.params.eventId,
      success: true,
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel registration" });
  }
});

app.get("/registrations/count", async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }
    const tenantId = resolveTenantIdFromRequest(req, defaultTenantId);

    if (mainTable) {
      const data = await ddb.send(
        new QueryCommand({
          TableName: mainTable,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": eventPk(eventId),
            ":sk": "REG#USER#",
          },
          Select: "COUNT",
        })
      );
      res.json({ count: data.Count || 0 });
      return;
    }

    if (!isLegacyFallbackAllowed(tenantId)) {
      res.status(403).json({ message: "Legacy fallback disabled" });
      return;
    }
    logLegacyFallback(req, "registrations_count");

    const data = await ddb.send(
      new QueryCommand({
        TableName: REGISTRATIONS_TABLE,
        KeyConditionExpression: "event_id = :event_id",
        ExpressionAttributeValues: { ":event_id": eventId },
        Select: "COUNT",
      })
    );

    res.json({ count: data.Count || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to count registrations" });
  }
});

app.get("/teams", requireAuth, async (req, res) => {
  try {
    const { eventId, inviteCode, mentorId } = req.query;
    const tenantId = req.user?.tenantId || null;
    if (eventId) {
      const ok = await authorize({ req }, "teams:read", {
        tenantId,
        eventId: String(eventId),
        requireEventTenantCheck: true,
        type: "team",
      });
      if (!ok) return;
      if (mainTable) {
        const data = await ddb.send(
          new QueryCommand({
            TableName: mainTable,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
              ":pk": eventPk(eventId),
              ":sk": "TEAM#",
            },
          })
        );

        let items = (data.Items || []).map((item) => ({
          ...item,
          event_id: eventId,
          team_id: parseIdFromSk(item.SK, "TEAM"),
          name: item.team_name || item.name,
        }));

        if (inviteCode) {
          items = items.filter((team) => team.invite_code === inviteCode.toString().toUpperCase());
        }
        if (mentorId) {
          items = items.filter((team) => team.mentor_id === mentorId);
        }
        res.json(items);
        return;
      }

      const data = await ddb.send(
        new QueryCommand({
          TableName: TEAMS_TABLE,
          KeyConditionExpression: "event_id = :event_id",
          ExpressionAttributeValues: { ":event_id": eventId },
        })
      );

      let items = data.Items || [];
      if (inviteCode) {
        items = items.filter(
          (team) => team.invite_code === inviteCode.toString().toUpperCase()
        );
      }
      if (mentorId) {
        items = items.filter((team) => team.mentor_id === mentorId);
      }
      res.json(items);
      return;
    }
    res.status(400).json({ message: "eventId is required" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

app.get("/roles/platform", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "roles:read", { tenantId, type: "role" });
    if (!ok) return;

    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    const { eventId } = req.query;
    const data = await ddb.send(
      new QueryCommand({
        TableName: mainTable,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": userPk(req.user.sub),
          ":sk": "PERMISSION#",
        },
        ConsistentRead: true,
      })
    );

    let items = (data.Items || []).filter((item) => item.type === "permission");
    if (eventId) {
      items = items.filter((item) => item.scope === `EVENT#${eventId}`);
    }
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

app.get("/permissions/roles", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "roles:read", {
      tenantId,
      type: "role",
    });
    if (!ok) return;

    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    const data = await ddb.send(
      new QueryCommand({
        TableName: mainTable,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": tenantPk(tenantId),
          ":sk": "ROLE#",
        },
        ConsistentRead: true,
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch role permissions" });
  }
});

app.put("/permissions/roles/:roleId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "roles:update", {
      tenantId,
      type: "role",
      id: req.params.roleId,
    });
    if (!ok) return;

    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : null;
    if (!permissions) {
      res.status(400).json({ message: "permissions array is required" });
      return;
    }

    const now = new Date().toISOString();
    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    const item = {
      PK: tenantPk(tenantId),
      SK: `ROLE#${req.params.roleId}`,
      type: "role_permissions",
      role_id: req.params.roleId,
      permissions,
      updated_by: req.user.sub,
      updated_at: now,
      created_at: req.body?.created_at || now,
    };

    await ddb.send(
      new PutCommand({
        TableName: mainTable,
        Item: item,
      })
    );

    await writeAuditLog({
      req,
      tenantId,
      action: "roles:update",
      resourceType: "role",
      resourceId: req.params.roleId,
      success: true,
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to update role permissions" });
  }
});

app.get("/events/:eventId/permissions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "permissions:read", {
      tenantId,
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "event",
      id: req.params.eventId,
    });
    if (!ok) return;

    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    const data = await ddb.send(
      new QueryCommand({
        TableName: mainTable,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": eventPk(req.params.eventId),
          ":sk": "PERMISSION#USER#",
        },
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch event permissions" });
  }
});

app.post("/events/:eventId/permissions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "permissions:grant", {
      tenantId,
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "event",
      id: req.params.eventId,
    });
    if (!ok) return;

    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    const { user_id, email, permission_type, role, allowedActions } = req.body;
    const resolvedEmail = normalizeEmail(email);
    const roleName = role || permission_type || "event_manager";
    const now = new Date().toISOString();

    let targetUserId = user_id || null;
    if (!targetUserId && resolvedEmail) {
      const membership = await ddb.send(
        new QueryCommand({
          TableName: mainTable,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": tenantPk(tenantId),
            ":sk": "USER#",
            ":email": resolvedEmail,
          },
          FilterExpression: "user_email = :email",
          ConsistentRead: true,
        })
      );
      const match = (membership.Items || [])[0];
      targetUserId = match ? parseIdFromSk(match.SK, "USER") : null;
    }

    if (!targetUserId) {
      res.status(400).json({ message: "user_id is required" });
      return;
    }

    const membershipCheck = await ddb.send(
      new GetCommand({
        TableName: mainTable,
        Key: { PK: tenantPk(tenantId), SK: tenantUserSk(targetUserId) },
        ConsistentRead: true,
      })
    );
    if (!membershipCheck.Item) {
      res.status(400).json({ message: "User is not part of this tenant" });
      return;
    }

    const scope = `EVENT#${req.params.eventId}`;
    const existingPermission = await ddb.send(
      new GetCommand({
        TableName: mainTable,
        Key: { PK: userPk(targetUserId), SK: permissionSk(scope) },
        ConsistentRead: true,
      })
    );
    if (existingPermission.Item) {
      res.status(409).json({ message: "Permission already granted" });
      return;
    }
    const resolvedActions = Array.isArray(allowedActions) && allowedActions.length > 0
      ? allowedActions
      : DEFAULT_EVENT_PERMISSION_ACTIONS;
    const permissionItem = buildPermissionItem(targetUserId, scope, {
      role: roleName,
      allowedActions: resolvedActions,
      grantedBy: req.user.sub,
      grantedAt: now,
    });
    const eventPermissionItem = {
      PK: eventPk(req.params.eventId),
      SK: `PERMISSION#USER#${targetUserId}`,
      type: "event_permission",
      user_id: targetUserId,
      role: roleName,
      allowedActions: resolvedActions,
      granted_by: req.user.sub,
      granted_at: now,
    };

    await Promise.all([
      ddb.send(
        new PutCommand({
          TableName: mainTable,
          Item: permissionItem,
        })
      ),
      ddb.send(
        new PutCommand({
          TableName: mainTable,
          Item: eventPermissionItem,
        })
      ),
    ]);

    await writeAuditLog({
      req,
      tenantId,
      action: "permissions:grant",
      resourceType: "event",
      resourceId: req.params.eventId,
      success: true,
    });

    res.status(201).json(permissionItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to grant permission" });
  }
});

app.delete("/events/:eventId/permissions/:permissionId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "permissions:revoke", {
      tenantId,
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "event",
      id: req.params.eventId,
    });
    if (!ok) return;

    if (!mainTable) {
      res.status(500).json({ message: "EVENTGO_MAIN_TABLE is not configured" });
      return;
    }

    let userId = req.query?.user_id || req.body?.user_id || null;
    const email = normalizeEmail(req.query?.email || req.body?.email || null);
    if (!userId && email) {
      const membership = await ddb.send(
        new QueryCommand({
          TableName: mainTable,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": tenantPk(tenantId),
            ":sk": "USER#",
            ":email": email,
          },
          FilterExpression: "user_email = :email",
          ConsistentRead: true,
        })
      );
      const match = (membership.Items || [])[0];
      userId = match ? parseIdFromSk(match.SK, "USER") : null;
    }

    if (!userId) {
      res.status(400).json({ message: "user_id is required" });
      return;
    }

    const scope = `EVENT#${req.params.eventId}`;
    await Promise.all([
      ddb.send(
        new DeleteCommand({
          TableName: mainTable,
          Key: { PK: userPk(userId), SK: permissionSk(scope) },
        })
      ),
      ddb.send(
        new DeleteCommand({
          TableName: mainTable,
          Key: { PK: eventPk(req.params.eventId), SK: `PERMISSION#USER#${userId}` },
        })
      ),
    ]);

    await writeAuditLog({
      req,
      tenantId,
      action: "permissions:revoke",
      resourceType: "event",
      resourceId: req.params.eventId,
      success: true,
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to revoke permission" });
  }
});

app.post("/events/:eventId/schedule", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "events:schedule", {
      tenantId,
      eventId: req.params.eventId,
      requireEventTenantCheck: true,
      type: "event",
      id: req.params.eventId,
    });
    if (!ok) return;
    if (!SCHEDULES_TABLE) {
      res.status(500).json({ message: "SCHEDULES_TABLE is not configured" });
      return;
    }
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "items array is required" });
      return;
    }

    const eventId = req.params.eventId;
    const timestamp = new Date().toISOString();
    const writes = items.map((item) => {
      const scheduleId = item.schedule_id || `sch_${crypto.randomUUID()}`;
      return ddb.send(
        new PutCommand({
          TableName: SCHEDULES_TABLE,
          Item: {
            ...item,
            schedule_id: scheduleId,
            event_id: eventId,
            created_at: item.created_at || timestamp,
            updated_at: timestamp,
          },
        })
      );
    });

    await Promise.all(writes);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to save schedule" });
  }
});

app.post("/teams", requireAuth, async (req, res) => {
  try {
    const { event_id, name, description } = req.body;
    if (!event_id || !name) {
      res.status(400).json({ message: "event_id and name are required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "teams:create", {
      tenantId,
      eventId: event_id,
      requireEventTenantCheck: true,
      type: "team",
      id: event_id,
    });
    if (!ok) return;

    const teamId = req.body.team_id || `team_${crypto.randomUUID()}`;
    const item = {
      event_id,
      team_id: teamId,
      name,
      description: description || null,
      leader_id: req.user.sub,
      invite_code: generateInviteCode(),
      status: "forming",
      current_round: "idea",
      total_score: 0,
      rank: null,
      created_at: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: TEAMS_TABLE,
        Item: item,
      })
    );

    await ddb.send(
      new PutCommand({
        TableName: TEAM_MEMBERS_TABLE,
        Item: {
          team_id: teamId,
          user_id: req.user.sub,
          role: "leader",
          joined_at: new Date().toISOString(),
        },
      })
    );

    await Promise.all([
      writeMainItem(
        buildTeamItem(event_id, teamId, {
          team_name: item.name,
          leader_id: item.leader_id,
          status: item.status,
          invite_code: item.invite_code,
          created_at: item.created_at,
        })
      ),
      writeMainItem(
        buildTeamMemberItem(teamId, req.user.sub, {
          role: "leader",
          joined_at: new Date().toISOString(),
        })
      ),
    ]);

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create team" });
  }
});

app.put("/teams/:teamId", requireAuth, async (req, res) => {
  try {
    const { event_id } = req.body;
    if (!event_id) {
      res.status(400).json({ message: "event_id is required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "teams:update", {
      tenantId,
      eventId: event_id,
      requireEventTenantCheck: true,
      type: "team",
      id: req.params.teamId,
    });
    if (!ok) return;

    const update = buildUpdateExpression({
      ...req.body,
      updated_at: new Date().toISOString(),
    });

    const data = await ddb.send(
      new UpdateCommand({
        TableName: TEAMS_TABLE,
        Key: { event_id, team_id: req.params.teamId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    const updated = data.Attributes || {};
    await writeMainItem(
      buildTeamItem(event_id, req.params.teamId, {
        team_name: updated.name || updated.team_name || null,
        leader_id: updated.leader_id || null,
        status: updated.status || null,
        invite_code: updated.invite_code || null,
        created_at: updated.created_at || null,
        updated_at: updated.updated_at || null,
      })
    );

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update team" });
  }
});

app.delete("/teams/:teamId", requireAuth, async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      res.status(400).json({ message: "event_id is required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "teams:delete", {
      tenantId,
      eventId: String(event_id),
      requireEventTenantCheck: true,
      type: "team",
      id: req.params.teamId,
    });
    if (!ok) return;

    await ddb.send(
      new DeleteCommand({
        TableName: TEAMS_TABLE,
        Key: { event_id, team_id: req.params.teamId },
      })
    );

    await deleteMainItem({
      PK: eventPk(event_id),
      SK: eventTeamSk(req.params.teamId),
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete team" });
  }
});

app.get("/teams/:teamId/members", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const eventId = req.query?.event_id ? String(req.query.event_id) : null;
    if (!eventId) {
      res.status(400).json({ message: "event_id is required" });
      return;
    }
    const ok = await authorize({ req }, "teams:read", {
      tenantId,
      eventId,
      requireEventTenantCheck: true,
      type: "team",
      id: req.params.teamId,
    });
    if (!ok) return;
    if (mainTable) {
      const data = await ddb.send(
        new QueryCommand({
          TableName: mainTable,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": teamPk(req.params.teamId),
            ":sk": "MEMBER#",
          },
        })
      );

      const items = (data.Items || []).map((item) => ({
        ...item,
        team_id: req.params.teamId,
        user_id: parseIdFromSk(item.SK, "MEMBER"),
      }));
      res.json(items);
      return;
    }

    const data = await ddb.send(
      new QueryCommand({
        TableName: TEAM_MEMBERS_TABLE,
        KeyConditionExpression: "team_id = :team_id",
        ExpressionAttributeValues: { ":team_id": req.params.teamId },
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

app.post("/teams/:teamId/members", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const eventId = req.body?.event_id || req.query?.event_id || null;
    if (!eventId) {
      res.status(400).json({ message: "event_id is required" });
      return;
    }
    const ok = await authorize({ req }, "teams:update", {
      tenantId,
      eventId: String(eventId),
      requireEventTenantCheck: true,
      type: "team",
      id: req.params.teamId,
    });
    if (!ok) return;
    const userId = req.body.user_id || req.user.sub;
    await ddb.send(
      new PutCommand({
        TableName: TEAM_MEMBERS_TABLE,
        Item: {
          team_id: req.params.teamId,
          user_id: userId,
          role: req.body.role || "member",
          joined_at: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(team_id) AND attribute_not_exists(user_id)",
      })
    );

    await writeMainItem(
      buildTeamMemberItem(req.params.teamId, userId, {
        role: req.body.role || "member",
        joined_at: new Date().toISOString(),
      })
    );

    res.status(201).json({ team_id: req.params.teamId, user_id: userId });
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      res.status(409).json({ message: "Already a member" });
      return;
    }
    res.status(500).json({ message: "Failed to add team member" });
  }
});

app.delete("/teams/:teamId/members/:userId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const eventId = req.query?.event_id || null;
    if (!eventId) {
      res.status(400).json({ message: "event_id is required" });
      return;
    }
    const ok = await authorize({ req }, "teams:update", {
      tenantId,
      eventId: String(eventId),
      requireEventTenantCheck: true,
      type: "team",
      id: req.params.teamId,
    });
    if (!ok) return;
    await ddb.send(
      new DeleteCommand({
        TableName: TEAM_MEMBERS_TABLE,
        Key: { team_id: req.params.teamId, user_id: req.params.userId },
      })
    );

    await deleteMainItem({
      PK: teamPk(req.params.teamId),
      SK: teamMemberSk(req.params.userId),
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to remove team member" });
  }
});

app.get("/notifications", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "notifications:read", {
      tenantId,
      ownerId: req.user.sub,
      ownerActions: ["notifications:read"],
      type: "notification",
      id: req.user.sub,
    });
    if (!ok) return;
    const data = await ddb.send(
      new QueryCommand({
        TableName: NOTIFICATIONS_TABLE,
        KeyConditionExpression: "user_id = :user_id",
        ExpressionAttributeValues: { ":user_id": req.user.sub },
        ScanIndexForward: false,
        Limit: 50,
      })
    );
    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

app.post("/notifications/mark-read", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "notifications:update", {
      tenantId,
      ownerId: req.user.sub,
      ownerActions: ["notifications:update"],
      type: "notification",
      id: req.user.sub,
    });
    if (!ok) return;
    const { notification_id } = req.body;
    if (!notification_id) {
      res.status(400).json({ message: "notification_id is required" });
      return;
    }

    const update = buildUpdateExpression({ is_read: true });
    await ddb.send(
      new UpdateCommand({
        TableName: NOTIFICATIONS_TABLE,
        Key: { user_id: req.user.sub, notification_id },
        ...update,
      })
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});

app.post("/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "notifications:update", {
      tenantId,
      ownerId: req.user.sub,
      ownerActions: ["notifications:update"],
      type: "notification",
      id: req.user.sub,
    });
    if (!ok) return;
    const data = await ddb.send(
      new QueryCommand({
        TableName: NOTIFICATIONS_TABLE,
        KeyConditionExpression: "user_id = :user_id",
        ExpressionAttributeValues: { ":user_id": req.user.sub },
      })
    );

    const updates = data.Items || [];
    await Promise.all(
      updates.map((item) =>
        ddb.send(
          new UpdateCommand({
            TableName: NOTIFICATIONS_TABLE,
            Key: { user_id: req.user.sub, notification_id: item.notification_id },
            ...buildUpdateExpression({ is_read: true }),
          })
        )
      )
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notifications" });
  }
});

app.get("/submissions", requireAuth, async (req, res) => {
  try {
    const { eventId, teamId, round } = req.query;
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "submissions:read", {
      tenantId,
      eventId: String(eventId),
      requireEventTenantCheck: true,
      type: "submission",
      id: String(eventId),
    });
    if (!ok) return;

    const data = await ddb.send(
      new QueryCommand({
        TableName: SUBMISSIONS_TABLE,
        KeyConditionExpression: "event_id = :event_id",
        ExpressionAttributeValues: { ":event_id": eventId },
      })
    );

    let items = data.Items || [];
    if (teamId) {
      items = items.filter((item) => item.team_id === teamId);
    }
    if (round) {
      items = items.filter((item) => item.round === round);
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

app.post("/submissions", requireAuth, async (req, res) => {
  try {
    const { event_id, team_id, round } = req.body;
    if (!event_id || !team_id || !round) {
      res.status(400).json({ message: "event_id, team_id, and round are required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "submissions:create", {
      tenantId,
      eventId: event_id,
      requireEventTenantCheck: true,
      type: "submission",
      id: event_id,
    });
    if (!ok) return;

    const submissionId = req.body.submission_id || `sub_${crypto.randomUUID()}`;
    const item = {
      ...req.body,
      submission_id: submissionId,
      event_id,
      team_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: SUBMISSIONS_TABLE,
        Item: item,
      })
    );

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create submission" });
  }
});

app.put("/submissions/:submissionId", requireAuth, async (req, res) => {
  try {
    const { event_id } = req.body;
    if (!event_id) {
      res.status(400).json({ message: "event_id is required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "submissions:update", {
      tenantId,
      eventId: event_id,
      requireEventTenantCheck: true,
      type: "submission",
      id: req.params.submissionId,
    });
    if (!ok) return;

    const update = buildUpdateExpression({
      ...req.body,
      updated_at: new Date().toISOString(),
    });

    const data = await ddb.send(
      new UpdateCommand({
        TableName: SUBMISSIONS_TABLE,
        Key: { event_id, submission_id: req.params.submissionId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update submission" });
  }
});

app.get("/rubrics", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "rubrics:read", {
      tenantId,
      eventId: String(eventId),
      requireEventTenantCheck: true,
      type: "rubric",
      id: String(eventId),
    });
    if (!ok) return;

    const data = await ddb.send(
      new QueryCommand({
        TableName: JUDGING_RUBRICS_TABLE,
        KeyConditionExpression: "event_id = :event_id",
        ExpressionAttributeValues: { ":event_id": eventId },
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rubrics" });
  }
});

app.post("/judging/scores", requireAuth, async (req, res) => {
  try {
    const { submission_id, rubric_id, score } = req.body;
    if (!submission_id || !rubric_id || score === undefined) {
      res.status(400).json({ message: "submission_id, rubric_id, and score are required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "judging:write", {
      tenantId,
      type: "judging",
      id: submission_id,
    });
    if (!ok) return;

    const item = {
      ...req.body,
      submission_id,
      judge_id: req.user.sub,
      updated_at: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: JUDGING_SCORES_TABLE,
        Item: item,
      })
    );

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to save score" });
  }
});

app.get("/judging/scores", requireAuth, async (req, res) => {
  try {
    const { submissionId } = req.query;
    if (!submissionId) {
      res.status(400).json({ message: "submissionId is required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "judging:read", {
      tenantId,
      type: "judging",
      id: String(submissionId),
    });
    if (!ok) return;

    const data = await ddb.send(
      new QueryCommand({
        TableName: JUDGING_SCORES_TABLE,
        KeyConditionExpression: "submission_id = :submission_id",
        ExpressionAttributeValues: { ":submission_id": submissionId },
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch scores" });
  }
});

app.post("/registrations/checkin", requireAuth, async (req, res) => {
  try {
    const { eventId, qrCode } = req.body;
    if (!eventId || !qrCode) {
      res.status(400).json({ message: "eventId and qrCode are required" });
      return;
    }

    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "registrations:update", {
      tenantId,
      eventId,
      requireEventTenantCheck: true,
      type: "registration",
      id: eventId,
    });
    if (!ok) return;

    const scanData = await ddb.send(
      new ScanCommand({
        TableName: REGISTRATIONS_TABLE,
        FilterExpression: "event_id = :event_id AND qr_code = :qr_code",
        ExpressionAttributeValues: {
          ":event_id": eventId,
          ":qr_code": qrCode.toUpperCase(),
        },
      })
    );

    const registration = (scanData.Items || [])[0];
    if (!registration) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    if (registration.check_in_time) {
      res.status(409).json({
        message: "Already checked in",
        registration,
      });
      return;
    }

    const checkInTime = new Date().toISOString();
    const update = buildUpdateExpression({
      check_in_time: checkInTime,
      check_in_by: req.user.sub,
      registration_status: "attended",
    });

    const updated = await ddb.send(
      new UpdateCommand({
        TableName: REGISTRATIONS_TABLE,
        Key: { event_id: registration.event_id, user_id: registration.user_id },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({ registration: updated.Attributes });
  } catch (error) {
    res.status(500).json({ message: "Failed to check in" });
  }
});

app.post("/media/presign", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const ok = await authorize({ req }, "media:presign", {
      tenantId,
      type: "media",
    });
    if (!ok) return;
    if (!S3_BUCKET_NAME) {
      res.status(500).json({ message: "S3_BUCKET_NAME is not configured" });
      return;
    }

    const { fileName, contentType, folder = "uploads", fileSize, assetType } = req.body;
    if (!fileName || !contentType) {
      res.status(400).json({ message: "fileName and contentType are required" });
      return;
    }

    if (String(folder).startsWith("assets")) {
      await logAssetRejection(req, "assets_upload_forbidden", { fileName, folder });
      res.status(400).json({ message: "Assets must be optimized and stored under /var/www/assets" });
      return;
    }

    if (contentType.startsWith("image/")) {
      if (contentType !== "image/webp") {
        await logAssetRejection(req, "invalid_mime", { fileName, contentType });
        res.status(400).json({ message: "Only image/webp uploads are allowed" });
        return;
      }
      if (!fileName.toLowerCase().endsWith(".webp")) {
        await logAssetRejection(req, "invalid_extension", { fileName, contentType });
        res.status(400).json({ message: "Only .webp files are allowed" });
        return;
      }
      if (!fileSize || Number.isNaN(Number(fileSize))) {
        await logAssetRejection(req, "missing_file_size", { fileName, contentType });
        res.status(400).json({ message: "fileSize is required for image uploads" });
        return;
      }
      const category = assetType || getAssetCategoryFromPath(`/${folder}/${fileName}`);
      const limit = getAssetSizeLimit(category);
      if (Number(fileSize) > limit) {
        await logAssetRejection(req, "file_size_exceeded", { fileName, contentType, fileSize, limit });
        res.status(400).json({ message: "Image exceeds size limits" });
        return;
      }
      lastAssetUploadAt = new Date().toISOString();
    }

    const key = `${folder}/${crypto.randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    const publicUrl = S3_PUBLIC_BASE_URL
      ? `${S3_PUBLIC_BASE_URL}/${key}`
      : `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    res.status(500).json({ message: "Failed to create upload URL" });
  }
});

if (process.env.ENFORCE_ASSET_GUARDRAILS === "true") {
  try {
    assertAssetGuardrails();
  } catch (error) {
    console.error("Asset guardrails failed:", error?.message || error);
    process.exit(1);
  }
}

app.listen(PORT, () => {
  console.log(`EventGo backend running on port ${PORT}`);
});
