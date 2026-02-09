# EventGo Access Patterns (Single Table)

## Tenant
- Get tenant meta
  - PK = TENANT#<tenantId>, SK = META

- List tenant users
  - PK = TENANT#<tenantId>, SK begins_with USER#

## Users
- Get user profile
  - PK = USER#<userId>, SK = PROFILE

- List users by role
  - GSI4PK = TENANT#<tenantId>#ROLE#<role>

## Events
- List tenant events
  - PK = TENANT#<tenantId>, SK begins_with EVENT#

- Public event discovery
  - GSI2PK = TENANT#<tenantId>#PUBLIC

- Get event config versions
  - PK = EVENT#<eventId>, SK begins_with CONFIG#

## Registrations
- Register user
  - PK = EVENT#<eventId>, SK = REG#USER#<userId>

- List user registrations
  - GSI1PK = USER#<userId>

## Teams
- List teams for event
  - PK = EVENT#<eventId>, SK begins_with TEAM#

- List team members
  - PK = TEAM#<teamId>, SK begins_with MEMBER#

## Certificates
- Verify certificate
  - GSI3PK = CERT#<certId>

## Audit
- List tenant audit logs
  - PK = TENANT#<tenantId>, SK begins_with AUDIT#
