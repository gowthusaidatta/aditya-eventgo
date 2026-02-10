# API Contract Specification
**Backend Source of Truth | DynamoDB Access Pattern Alignment**

## 1. User Management (USERS Table)

### `GET /users/me` (Self Profile)
*   **Access Pattern**: `GetItem(PK=userId)`
*   **Auth**: Required (JWT Subject claim)

### `GET /users/:userId` (Admin/Profile View)
*   **Access Pattern**: `GetItem(PK=:userId)`
*   **Auth**: Admin or Owner only
*   **Response**: `PublicProfile` (sanitized) or `FullProfile` (owner/admin)

---

## 2. Event Management (EVENTS Table)

### `GET /events` (Public Discovery)
*   **Access Pattern**: `Query(GSI=StatusIndex, PK="PUBLISHED")`
*   **Params**: `type`, `university_id` (filter), `limit`, `nextToken`
*   **Response**: List of `EventSummary`

### `GET /events/:eventId` (Detail View)
*   **Access Pattern**: `GetItem(PK=:eventId)`
*   **Auth**: Public (if published), Role-Based (if draft/archived)
*   **Response**: `EventDetail`

### `POST /events` (Create Event)
*   **Auth**: `Coordinator` | `Admin`
*   **Input**: `EventSchema` (Title, Dates, OrganizerId...)
*   **Side Effect**: Write to `EVENTS` table, add creator as `ORGANIZER` in `USER-ROLES`

---

## 3. Registrations (REGISTRATIONS Table)

### `GET /events/:eventId/registrations` (Organizer View)
*   **Access Pattern**: `Query(PK=:eventId)`
*   **Auth**: `Organizer` +
*   **Response**: List of `RegistrationDetail` (User expanded via `BatchGetItem` on `USERS` table if needed, or store minimal user data in Registration item)

### `POST /events/:eventId/register` (User Action)
*   **Access Pattern**: `PutItem(PK=:eventId, SK=:userId)`
*   **Auth**: `Student`
*   **Rules**: Check `EVENTS` status is OPEN. Check `max_participants`. Handle waitlist logic.

### `GET /users/me/registrations` (My Events)
*   **Access Pattern**: `Query(GSI=UserRegIndex, PK=:userId)`
*   **Auth**: Self
*   **Response**: List of `EventSummary` for registered events

---

## 4. Team Management (TEAMS & TEAM-MEMBERS Tables)

### `GET /events/:eventId/teams`
*   **Access Pattern**: `Query(PK=:eventId)`
*   **Auth**: `Organizer` | `Judge` | `Participant`
*   **Response**: List of `TeamSummary`

### `POST /events/:eventId/teams` (Create Team)
*   **Access Pattern**: `TransactWriteItems`
    1.  `PutItem` to `TEAMS` (PK=:eventId, SK=:teamId)
    2.  `PutItem` to `TEAM-MEMBERS` (PK=:teamId, SK=:userId, Role='LEADER')
*   **Auth**: `Student`
*   **Rules**: Check event allows teams.

### `POST /teams/:teamId/join`
*   **Access Pattern**: `PutItem` to `TEAM-MEMBERS` (PK=:teamId, SK=:userId)
*   **Auth**: `Student` (with Invite Code)
*   **Rules**: Check current team size < Max Size.

---

## 5. Submissions & Judging

### `GET /events/:eventId/submissions`
*   **Access Pattern**: `Query(PK=:eventId)`
*   **Auth**: `Judge` | `Organizer`
*   **Response**: List of `SubmissionEntry`

### `POST /events/:eventId/submissions`
*   **Access Pattern**: `PutItem(PK=:eventId, SK=:subId)`
*   **Auth**: `Student` (Team Leader only if team event)

### `POST /submissions/:subId/score`
*   **Access Pattern**: `PutItem(PK=:subId, SK=:judgeId)` to `JUDGING-SCORES`
*   **Auth**: `Judge`
*   **Rules**: `ConditionExpression: attribute_not_exists(score)` (prevent double scoring)

---

## 6. System Notifications

### `GET /notifications`
*   **Access Pattern**: `Query(PK=:userId)`
*   **Auth**: Self
*   **Filter**: `unread=true` (Local filter or GSI)

---

## 7. Certificates

### `GET /certificates/:userId`
*   **Access Pattern**: `Query(PK=:userId)`
*   **Auth**: Self | `Admin`
*   **Response**: List of `CertificateMetadata` (PDF URL signed)
