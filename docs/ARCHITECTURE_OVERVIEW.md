# EventGo Architecture Overview
**University-Grade SaaS Platform (DynamoDB Multi-Table Strategy)**

## 1. Core Principles
*   **Database**: AWS DynamoDB (Multi-Table Design).
*   **Pattern**: Access-Pattern Driven Design. No SQL joins, no scans.
*   **Source of Truth**: Backend is the authoritative source.
*   **Scale**: Multi-University, 10k+ users per university.

---

## 2. Table Responsibility Matrix

| Table Name | Primary Key (PK) | Sort Key (SK) | Responsible For | Critical Rules |
| :--- | :--- | :--- | :--- | :--- |
| **USERS** | `userId` | - | User profiles, University mapping, Auth state | PK is immutable. Status determines login access. |
| **ROLES** | `role_id` | - | System role definitions (Student, Admin, etc.) | Static lookup table. Rarely changes. |
| **USER-ROLES** | `event_id` | `user_id` | **RBAC Core**. Maps User ↔ Role ↔ Event | **MUST be checked** for every protected action. |
| **EVENTS** | `eventId` | - | Event metadata (Dates, Type, Status) | Parent entity for registrations/teams. |
| **OPPORTUNITIES** | `oppId` | - | Internships, Jobs, Announcements | Can exist independently of events. |
| **REGISTRATIONS** | `event_id` | `user_id` | User signups for events | 1:1 mapping. Handles waitlists/approvals. |
| **TEAMS** | `event_id` | `team_id` | Team metadata (Name, Leader) | Leader must be a valid user in USERS table. |
| **TEAM-MEMBERS** | `team_id` | `user_id` | Team composition | Enforce max team size here. Prevent multi-team join. |
| **SUBMISSIONS** | `event_id` | `submission_id` | Project files, Github links | Linked to Team ID or User ID. |
| **JUDGING-SCORES**| `submission_id`| `judge_id` | Individual score entries | Prevent double-scoring by same judge. |
| **SCHEDULES** | `event_id` | `schedule_id` | Calendar slots, Agenda items | Detect time conflicts on write. |
| **CERTIFICATES** | `user_id` | `event_id` | Issued credentials | Immutable once issued. |
| **NOTIFICATIONS** | `user_id` | `notification_id`| Alerts, Messages | Support TTL for auto-cleanup. |

---

## 3. Scalability & Cost Governance

### Scalability Strategy
1.  **Partitioning**:
    *   All tables partition by `PK` (e.g., `event_id`, `user_id`).
    *   This ensures traffic for different events/users is distributed across shards.
2.  **Read/Write Capacity**:
    *   Use **On-Demand** mode for unpredictable workloads (e.g., flash registration spikes).
    *   Switch to **Provisioned** with Auto-Scaling for steady-state events like exams.
3.  **Caching**:
    *   Implement **DAX** (DynamoDB Accelerator) for high-read tables like `EVENTS` and `ROLES` if read volume exceeds 1M/sec.
    *   Cache `USER-ROLES` in Lambda memory (short TTL) to reduce authorization latency.

### Cost Control
1.  **Avoid Scans**: Strict prohibition on `Scan` operations. All access via `Query` on PK/SK or GSI.
2.  **Data Archival**:
    *   Use **TTL (Time To Live)** on `NOTIFICATIONS` and `SCHEDULES` (past events) to auto-delete old data.
    *   Archive closed `EVENTS` to S3 (glacier) after 1 academic year.
3.  **Payload Size**:
    *   Store large text/blobs in **S3**, store only URL in DynamoDB (e.g., `SUBMISSIONS` files).

---

## 4. Edge Case Handling Strategies

### 🛑 Critical Scenarios
1.  **User Deletion with Active Registrations**:
    *   *Strategy*: Soft delete only. Set `status = "DELETED"` in USERS. Keeps referential integrity for historical logs.
2.  **Event Cancellation**:
    *   *Strategy*: Transactional update. Atomic write to `EVENTS` status -> Trigger Async Lambda to notify all users in `REGISTRATIONS`.
3.  **Team Leader Exits**:
    *   *Strategy*: Prevent exit if team size > 1. Require leader transfer first. If size = 1, dissolve team.
4.  **Concurrent Scoring**:
    *   *Strategy*: Conditional Writes (`attribute_not_exists(sk)`). If a judge tries to submit twice, the second write fails.
5.  **Cross-University Leakage**:
    *   *Strategy*: Every query must include `university_id` filter or tenant context from the auth token.
