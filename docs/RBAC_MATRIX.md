# Role-Based Access Control (RBAC) Matrix

**Table**: `Datta-Evntgo-Datta-2005-user-roles` (Checked on every protected API call)

## 1. Role Definitions

| Role | Description | Scope | typically assigned to | 
| :--- | :--- | :--- | :--- |
| **Student** | Standard participant. Can view publicly listed events. | University-wide | All verified users |
| **Volunteer** | Assist event ops. Can handle check-ins. | Event-specific | Student volunteers |
| **Organizer** | Manage event logistics. Edit details. cannot publish. | Event-specific | Student leads / Faculty |
| **Coordinator** | Oversee multiple events. Publish/Cancel authority. | Department/Category | Faculty / HODs |
| **Judge** | Evaluation only. Can view submissions & score. | Event-specific | External experts / Alumni |
| **Faculty** | High-level oversight. Access to all dept data. | Department-wide | Professors |
| **Admin** | Full system control (User mgmt, Config). | System-wide | IT / Dean Office |

---

## 2. Permission Matrix (Action vs Role)

| Action | Student | Volunteer | Organizer | Coordinator | Judge | Faculty | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Event** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Register** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create Team** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Submit Project** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Edit Event** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Publish Event** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Manage Teams** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Approve Reg.** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Score Subs.** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Check-in User** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Issue Certs** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Delete Event** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **User Mgmt** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Enforcement Strategy (Backend)

Every protected API call must perform the following `Authorize()` check:

1.  **Extract `user_id`** from JWT token.
2.  **Extract `event_id`** from request parameters (if applicable).
3.  **Validate `user_id`** exists in `USERS` table and is Active.
4.  **Query `USER-ROLES` table** with PK=`event_id` AND SK=`user_id`.
    *   *If Global Admin*: Skip event-level check (User Role = 'Admin').
    *   *If Specific Event*: Check if returned role matches required permission.
5.  **Return 403 Forbidden** if no match found.

### Example Logic (Pseudo-code)

```javascript
async function authorize(userId, eventId, action) {
  // 1. Check Global Admin
  const globalRole = await getUserRole(userId, 'GLOBAL');
  if (globalRole === 'ADMIN') return true;

  // 2. Check Event Context
  if (!eventId) return false; // Action requires event context
  
  const eventRole = await getUserRole(userId, eventId);
  const allowedRoles = PERMISSIONS[action]; // e.g. ['ORGANIZER', 'COORDINATOR']
  
  return allowedRoles.includes(eventRole);
}
```
