# EventGo Single-Table DynamoDB Design

This document defines the production single-table data model for EventGo.

## Table
- Table name: EventGo_Main (configurable)
- Partition key: PK (string)
- Sort key: SK (string)
- Billing: On-demand

## Core Attribute Definitions
- PK, SK
- GSI1PK, GSI1SK (user -> events/registrations)
- GSI2PK, GSI2SK (tenant -> public event discovery)
- GSI3PK, GSI3SK (certificate verification)
- GSI4PK, GSI4SK (role -> users)

## Item Types (examples)

### Tenant
- PK: TENANT#<tenantId>
- SK: META
- type: tenant
- name, domain_allowlist[], status
- created_at, updated_at

### Tenant User Membership
- PK: TENANT#<tenantId>
- SK: USER#<userId>
- type: tenant_user
- role, status, primary (bool)
- user_email, display_name
- GSI4PK: TENANT#<tenantId>#ROLE#<role>
- GSI4SK: USER#<userId>

### User Profile
- PK: USER#<userId>
- SK: PROFILE
- type: user_profile
- full_name, email, phone, department, year_of_study
- roll_number or employee_id
- profile_photo_url
- completion_percent
- verification_status, user_status

### Event
- PK: TENANT#<tenantId>
- SK: EVENT#<eventId>
- type: event
- title, short_description, full_description
- event_type, mode, location
- start_at, end_at, registration_deadline
- banner_url, promo_video_url
- visibility (public|private|invite)
- participation_type (individual|team)
- tags[], skills[], difficulty_level
- status (draft|published|closed)
- created_by, created_at, updated_at
- GSI2PK: TENANT#<tenantId>#PUBLIC (if public)
- GSI2SK: EVENT#<eventId>#<start_at>

### Event Config Version
- PK: EVENT#<eventId>
- SK: CONFIG#<version>
- type: event_config
- event_config (JSON)
- created_at, created_by

### Registration
- PK: EVENT#<eventId>
- SK: REG#USER#<userId>
- type: registration
- status (registered|waitlisted|approved|rejected)
- form_data (JSON)
- team_data (JSON)
- created_at
- GSI1PK: USER#<userId>
- GSI1SK: EVENT#<eventId>

### Team
- PK: EVENT#<eventId>
- SK: TEAM#<teamId>
- type: team
- team_name, leader_id, status
- created_at

### Team Member
- PK: TEAM#<teamId>
- SK: MEMBER#<userId>
- type: team_member
- role (leader|member)

### Certificate
- PK: EVENT#<eventId>
- SK: CERT#<certId>
- type: certificate
- cert_id, recipient_user_id, issue_date
- verification_url
- GSI3PK: CERT#<certId>
- GSI3SK: EVENT#<eventId>

### Audit Log
- PK: TENANT#<tenantId>
- SK: AUDIT#<timestamp>#<id>
- type: audit
- actor_user_id, action, entity_type, entity_id
- before, after, ip, user_agent

## Access Patterns
1) List tenant events
- PK = TENANT#<tenantId>
- SK begins_with EVENT#

2) Fetch event by id
- PK = TENANT#<tenantId>
- SK = EVENT#<eventId>

3) Fetch event config versions
- PK = EVENT#<eventId>
- SK begins_with CONFIG#

4) List user registrations
- GSI1PK = USER#<userId>
- GSI1SK begins_with EVENT#

5) Public event discovery
- GSI2PK = TENANT#<tenantId>#PUBLIC
- GSI2SK begins_with EVENT#

6) Certificate verification
- GSI3PK = CERT#<certId>

7) List users by role
- GSI4PK = TENANT#<tenantId>#ROLE#<role>

## Notes
- Avoid scans in production. Use GSIs and targeted PK/SK queries.
- Event config is versioned for auditability and safe edits after publish.
- All timestamps are ISO 8601 strings.
