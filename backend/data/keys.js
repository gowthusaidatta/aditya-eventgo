const prefix = (name, value) => `${name}#${value}`;

const tenantPk = (tenantId) => prefix("TENANT", tenantId);
const userPk = (userId) => prefix("USER", userId);
const eventPk = (eventId) => prefix("EVENT", eventId);
const teamPk = (teamId) => prefix("TEAM", teamId);

const tenantMetaSk = () => "META";
const tenantUserSk = (userId) => prefix("USER", userId);
const userProfileSk = () => "PROFILE";
const tenantEventSk = (eventId) => prefix("EVENT", eventId);
const eventConfigSk = (version) => prefix("CONFIG", version);
const eventRegSk = (userId) => `REG#USER#${userId}`;
const eventTeamSk = (teamId) => prefix("TEAM", teamId);
const teamMemberSk = (userId) => prefix("MEMBER", userId);
const eventCertSk = (certId) => prefix("CERT", certId);
const auditSk = (timestamp, id) => `AUDIT#${timestamp}#${id}`;

const gsi1Pk = (userId) => userPk(userId);
const gsi1SkEvent = (eventId) => prefix("EVENT", eventId);

const gsi2PkPublic = (tenantId) => `${tenantPk(tenantId)}#PUBLIC`;
const gsi2SkEvent = (eventId, startAt) => `EVENT#${eventId}#${startAt || ""}`;

const gsi3PkCert = (certId) => prefix("CERT", certId);
const gsi3SkEvent = (eventId) => prefix("EVENT", eventId);

const gsi4PkRole = (tenantId, role) => `${tenantPk(tenantId)}#ROLE#${role}`;
const gsi4SkUser = (userId) => userPk(userId);

module.exports = {
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
};
