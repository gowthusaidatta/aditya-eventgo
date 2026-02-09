# EventGo API Contracts (Core)

## Tenants
- GET /tenants
- POST /tenants
- GET /tenants/:tenantId

## Users
- GET /users/me
- PUT /users/me
- GET /tenants/:tenantId/users
- PUT /tenants/:tenantId/users/:userId/role

## Events
- POST /tenants/:tenantId/events
- PUT /tenants/:tenantId/events/:eventId
- GET /tenants/:tenantId/events
- GET /events/:eventId
- GET /events/:eventId/schema

## Registrations
- POST /events/:eventId/registrations
- GET /events/:eventId/registrations
- PUT /events/:eventId/registrations/:userId/status

## Teams
- POST /events/:eventId/teams
- POST /events/:eventId/teams/join
- DELETE /events/:eventId/teams/leave

## Certificates
- POST /events/:eventId/certificates/generate
- GET /certificates/:certId/verify

## Notifications
- GET /notifications
- POST /notifications
