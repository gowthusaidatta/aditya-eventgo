const {
  tenantPk,
  userPk,
  eventPk,
  teamPk,
  tenantMetaSk,
  tenantUserSk,
  userProfileSk,
  tenantEventSk,
  eventConfigSk,
  eventRegSk,
  eventTeamSk,
  teamMemberSk,
  eventCertSk,
  auditSk,
  gsi1Pk,
  gsi1SkEvent,
  gsi2PkPublic,
  gsi2SkEvent,
  gsi3PkCert,
  gsi3SkEvent,
  gsi4PkRole,
  gsi4SkUser,
} = require("./keys");

const buildTenantItem = (tenantId, attributes = {}) => ({
  PK: tenantPk(tenantId),
  SK: tenantMetaSk(),
  type: "tenant",
  ...attributes,
});

const buildTenantUserItem = (tenantId, userId, attributes = {}) => ({
  PK: tenantPk(tenantId),
  SK: tenantUserSk(userId),
  type: "tenant_user",
  GSI4PK: gsi4PkRole(tenantId, attributes.role || "student"),
  GSI4SK: gsi4SkUser(userId),
  ...attributes,
});

const buildUserProfileItem = (userId, attributes = {}) => ({
  PK: userPk(userId),
  SK: userProfileSk(),
  type: "user_profile",
  ...attributes,
});

const buildEventItem = (tenantId, eventId, attributes = {}) => {
  const item = {
    PK: tenantPk(tenantId),
    SK: tenantEventSk(eventId),
    type: "event",
    ...attributes,
  };

  if (attributes.visibility === "public") {
    item.GSI2PK = gsi2PkPublic(tenantId);
    item.GSI2SK = gsi2SkEvent(eventId, attributes.start_at);
  }

  return item;
};

const buildEventConfigItem = (eventId, version, attributes = {}) => ({
  PK: eventPk(eventId),
  SK: eventConfigSk(version),
  type: "event_config",
  ...attributes,
});

const buildRegistrationItem = (eventId, userId, attributes = {}) => ({
  PK: eventPk(eventId),
  SK: eventRegSk(userId),
  type: "registration",
  GSI1PK: gsi1Pk(userId),
  GSI1SK: gsi1SkEvent(eventId),
  ...attributes,
});

const buildTeamItem = (eventId, teamId, attributes = {}) => ({
  PK: eventPk(eventId),
  SK: eventTeamSk(teamId),
  type: "team",
  ...attributes,
});

const buildTeamMemberItem = (teamId, userId, attributes = {}) => ({
  PK: teamPk(teamId),
  SK: teamMemberSk(userId),
  type: "team_member",
  ...attributes,
});

const buildCertificateItem = (eventId, certId, attributes = {}) => ({
  PK: eventPk(eventId),
  SK: eventCertSk(certId),
  type: "certificate",
  GSI3PK: gsi3PkCert(certId),
  GSI3SK: gsi3SkEvent(eventId),
  ...attributes,
});

const buildAuditItem = (tenantId, timestamp, id, attributes = {}) => ({
  PK: tenantPk(tenantId),
  SK: auditSk(timestamp, id),
  type: "audit",
  ...attributes,
});

module.exports = {
  buildTenantItem,
  buildTenantUserItem,
  buildUserProfileItem,
  buildEventItem,
  buildEventConfigItem,
  buildRegistrationItem,
  buildTeamItem,
  buildTeamMemberItem,
  buildCertificateItem,
  buildAuditItem,
};
