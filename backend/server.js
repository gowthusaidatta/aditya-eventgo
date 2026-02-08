const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const crypto = require("crypto");
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

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
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

app.post("/auth/login", async (req, res) => {
  if (!ensureCognitoConfig(res)) return;

  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }

  const secretHash = buildSecretHash(username);

  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: username,
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

  if (COGNITO_CLIENT_SECRET && !username) {
    res.status(400).json({ message: "Username is required for token refresh" });
    return;
  }

  const secretHash = username ? buildSecretHash(username) : undefined;

  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(username ? { USERNAME: username } : {}),
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

  const secretHash = buildSecretHash(email);
  const attributes = [{ Name: "email", Value: email }];
  if (name) attributes.push({ Name: "name", Value: name });
  if (phone) attributes.push({ Name: "phone_number", Value: phone });

  try {
    const response = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
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

  const secretHash = buildSecretHash(username);

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
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

  const secretHash = buildSecretHash(username);

  try {
    const response = await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
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

  const secretHash = buildSecretHash(username);

  try {
    const response = await cognitoClient.send(
      new ForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
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

  const secretHash = buildSecretHash(username);

  try {
    await cognitoClient.send(
      new ConfirmForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
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

app.post("/events", requireAuth, async (req, res) => {
  try {
    const errors = validateEventPayload(req.body || {});
    if (errors.length > 0) {
      res.status(400).json({ message: "Validation failed", errors });
      return;
    }

    const eventId = req.body.eventId || `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const item = {
      ...req.body,
      eventId,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
    };

    await ddb.send(
      new PutCommand({
        TableName: EVENTS_TABLE,
        Item: item,
      })
    );

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create event" });
  }
});

app.put("/events/:eventId", requireAuth, async (req, res) => {
  try {
    const errors = validateEventPayload(req.body || {});
    if (errors.length > 0) {
      res.status(400).json({ message: "Validation failed", errors });
      return;
    }

    const updateFields = { ...req.body, updatedAt: new Date().toISOString() };
    const update = buildUpdateExpression(updateFields);
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    const data = await ddb.send(
      new UpdateCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update event" });
  }
});

app.delete("/events/:eventId", requireAuth, async (req, res) => {
  try {
    await ddb.send(
      new DeleteCommand({
        TableName: EVENTS_TABLE,
        Key: { eventId: req.params.eventId },
      })
    );
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
    const oppId = req.body.oppId || `opp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const item = {
      ...req.body,
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
    const updateFields = { ...req.body, updatedAt: new Date().toISOString() };
    const update = buildUpdateExpression(updateFields);
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

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
    const userId = req.user.sub;
    const data = await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
      })
    );
    const existing = data.Item || {};
    const now = new Date().toISOString();
    const isSuperAdmin = isSuperAdminEmail(req.user.email);

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
    const userType = req.query.userType ? req.query.userType.toString() : null;
    const verified = req.query.verified ? req.query.verified.toString() : null;
    const ids = (req.query.ids || "")
      .toString()
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

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

    res.json(data.Responses?.[USERS_TABLE] || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.put("/users/:userId", requireAuth, async (req, res) => {
  try {
    const update = buildUpdateExpression({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    if (!update) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    const data = await ddb.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: req.params.userId },
        ...update,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(data.Attributes || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to update user" });
  }
});

app.delete("/users/:userId", requireAuth, async (req, res) => {
  try {
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
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

app.put("/users/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const now = new Date().toISOString();
    const isSuperAdmin = isSuperAdminEmail(req.user.email);
    const item = {
      ...req.body,
      userId,
      updatedAt: now,
      createdAt: req.body.createdAt || now,
    };

    if (isSuperAdmin) {
      item.user_type = "admin";
      item.is_verified = true;
      item.email = req.user.email;
      item.full_name = item.full_name || req.user.name || req.user.email;
    }

    await ddb.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: item,
      })
    );

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to update user profile" });
  }
});

app.post("/registrations", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const item = {
      ...req.body,
      event_id: eventId,
      user_id: userId,
      qr_code: req.body.qr_code || generateQrCode(),
      registration_status: req.body.registration_status || "confirmed",
      registered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: REGISTRATIONS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(event_id) AND attribute_not_exists(user_id)",
      })
    );

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
          res.json(data.Items || []);
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
    await ddb.send(
      new DeleteCommand({
        TableName: REGISTRATIONS_TABLE,
        Key: { event_id: req.params.eventId, user_id: req.user.sub },
      })
    );
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
    if (eventId) {
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

    const data = await ddb.send(new ScanCommand({ TableName: TEAMS_TABLE }));
    let items = data.Items || [];
    if (mentorId) {
      items = items.filter((team) => team.mentor_id === mentorId);
    }
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

app.get("/roles/platform", requireAuth, async (req, res) => {
  try {
    if (!ROLES_TABLE) {
      res.status(500).json({ message: "ROLES_TABLE is not configured" });
      return;
    }
    const { role, eventId } = req.query;
    const filters = ["user_id = :user_id"];
    const values = { ":user_id": req.user.sub };

    if (role) {
      filters.push("#role = :role");
      values[":role"] = role;
    }
    if (eventId) {
      filters.push("event_id = :event_id");
      values[":event_id"] = eventId;
    }

    const data = await ddb.send(
      new ScanCommand({
        TableName: ROLES_TABLE,
        FilterExpression: filters.join(" AND "),
        ExpressionAttributeValues: values,
        ExpressionAttributeNames: role ? { "#role": "role" } : undefined,
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

app.get("/permissions/roles", requireAuth, async (req, res) => {
  try {
    if (!ROLES_TABLE) {
      res.status(500).json({ message: "ROLES_TABLE is not configured" });
      return;
    }

    const data = await ddb.send(
      new ScanCommand({
        TableName: ROLES_TABLE,
        FilterExpression: "role_type = :role_type",
        ExpressionAttributeValues: {
          ":role_type": "college_role_permissions",
        },
      })
    );

    res.json(data.Items || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch role permissions" });
  }
});

app.put("/permissions/roles/:roleId", requireAuth, async (req, res) => {
  try {
    if (!ROLES_TABLE) {
      res.status(500).json({ message: "ROLES_TABLE is not configured" });
      return;
    }

    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : null;
    if (!permissions) {
      res.status(400).json({ message: "permissions array is required" });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      role_id: req.params.roleId,
      role_type: "college_role_permissions",
      permissions,
      updated_by: req.user.sub,
      updated_at: now,
      created_at: req.body?.created_at || now,
    };

    await ddb.send(
      new PutCommand({
        TableName: ROLES_TABLE,
        Item: item,
      })
    );

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to update role permissions" });
  }
});

app.get("/events/:eventId/permissions", requireAuth, async (req, res) => {
  try {
    if (!EVENT_PERMISSIONS_TABLE) {
      res.status(500).json({ message: "EVENT_PERMISSIONS_TABLE is not configured" });
      return;
    }

    const data = await ddb.send(
      new QueryCommand({
        TableName: EVENT_PERMISSIONS_TABLE,
        KeyConditionExpression: "event_id = :event_id",
        ExpressionAttributeValues: { ":event_id": req.params.eventId },
      })
    );

    const items = (data.Items || []).filter((item) => item.is_active !== false);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch event permissions" });
  }
});

app.post("/events/:eventId/permissions", requireAuth, async (req, res) => {
  try {
    if (!EVENT_PERMISSIONS_TABLE) {
      res.status(500).json({ message: "EVENT_PERMISSIONS_TABLE is not configured" });
      return;
    }

    const { user_id, permission_type } = req.body;
    if (!user_id || !permission_type) {
      res.status(400).json({ message: "user_id and permission_type are required" });
      return;
    }

    const existing = await ddb.send(
      new QueryCommand({
        TableName: EVENT_PERMISSIONS_TABLE,
        KeyConditionExpression: "event_id = :event_id",
        FilterExpression: "user_id = :user_id AND permission_type = :permission_type AND is_active = :is_active",
        ExpressionAttributeValues: {
          ":event_id": req.params.eventId,
          ":user_id": user_id,
          ":permission_type": permission_type,
          ":is_active": true,
        },
      })
    );

    if ((existing.Items || []).length > 0) {
      res.status(409).json({ message: "Permission already granted" });
      return;
    }

    const permissionId = req.body.permission_id || `perm_${crypto.randomUUID()}`;
    const item = {
      event_id: req.params.eventId,
      permission_id: permissionId,
      user_id,
      permission_type,
      granted_by: req.user.sub,
      granted_at: new Date().toISOString(),
      is_active: true,
    };

    await ddb.send(
      new PutCommand({
        TableName: EVENT_PERMISSIONS_TABLE,
        Item: item,
      })
    );

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to grant permission" });
  }
});

app.delete("/events/:eventId/permissions/:permissionId", requireAuth, async (req, res) => {
  try {
    if (!EVENT_PERMISSIONS_TABLE) {
      res.status(500).json({ message: "EVENT_PERMISSIONS_TABLE is not configured" });
      return;
    }

    const update = buildUpdateExpression({
      is_active: false,
      revoked_by: req.user.sub,
      revoked_at: new Date().toISOString(),
    });

    await ddb.send(
      new UpdateCommand({
        TableName: EVENT_PERMISSIONS_TABLE,
        Key: { event_id: req.params.eventId, permission_id: req.params.permissionId },
        ...update,
      })
    );

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to revoke permission" });
  }
});

app.post("/events/:eventId/schedule", requireAuth, async (req, res) => {
  try {
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

    await ddb.send(
      new DeleteCommand({
        TableName: TEAMS_TABLE,
        Key: { event_id, team_id: req.params.teamId },
      })
    );

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete team" });
  }
});

app.get("/teams/:teamId/members", requireAuth, async (req, res) => {
  try {
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
    await ddb.send(
      new DeleteCommand({
        TableName: TEAM_MEMBERS_TABLE,
        Key: { team_id: req.params.teamId, user_id: req.params.userId },
      })
    );
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to remove team member" });
  }
});

app.get("/notifications", requireAuth, async (req, res) => {
  try {
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
    if (!S3_BUCKET_NAME) {
      res.status(500).json({ message: "S3_BUCKET_NAME is not configured" });
      return;
    }

    const { fileName, contentType, folder = "uploads" } = req.body;
    if (!fileName || !contentType) {
      res.status(400).json({ message: "fileName and contentType are required" });
      return;
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

app.listen(PORT, () => {
  console.log(`EventGo backend running on port ${PORT}`);
});
