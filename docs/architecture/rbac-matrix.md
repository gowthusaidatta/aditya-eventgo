# EventGo RBAC Matrix

## Roles
- student
- organizer
- coordinator
- faculty
- volunteer
- tenant_admin
- super_admin

## Permissions (examples)
- view_events
- register_event
- manage_registrations
- create_event
- edit_event
- delete_event
- approve_event
- manage_users
- manage_roles
- view_analytics
- manage_certificates
- manage_tenants

## Matrix (high-level)
- student: view_events, register_event
- organizer: view_events, create_event, edit_event, manage_registrations
- coordinator: view_events, manage_registrations, check_in
- faculty: view_events, approve_event, view_analytics
- volunteer: view_events, check_in
- tenant_admin: all tenant permissions
- super_admin: platform-wide permissions
