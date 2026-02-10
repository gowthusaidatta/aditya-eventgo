

# EventGo - Aditya University Collaboration

An event management platform for colleges and students to connect through events and hackathons.

---

## 🎨 Branding & Design

### Dual Logo Header
- Display both **EventGo** logo and **Aditya University** logo in the header
- Logos appear side-by-side with "in collaboration with" text
- Professional styling with dark navy theme

---

## 👥 User Roles & Signup

### Student Signup
- Full name, email, password
- Roll number, college name, branch, graduation year
- Phone number (optional)
- Access to browse events, register for hackathons

### College Signup (Role System)
During college signup, user selects their role:

| Role | Permissions |
|------|-------------|
| **Principal** | Full access: Create, edit, delete events • Manage all registrations • View analytics • Verify other college users |
| **Dean** | Full access: Same as Principal (except user verification) |
| **Staff Coordinator** | Create events • Manage registrations • View all college events |
| **Student Coordinator** | View-only access • See registrations only for events they're involved in |

### Admin Account
- Username: Datta
- Email: Datta@gmail.com
- Password: Datta@1235
- To set up: Sign up with these credentials, then promote using database function

---

## 🏠 Core Features

### Landing Page
- Hero section with EventGo logo
- Stats display (Events, Colleges, Hackathons, Students)
- Featured events carousel
- Call-to-action for signup

### Events System
- Browse and discover events
- Event details with registration form
- Event categories (workshops, seminars, fests, competitions)
- Registration requires: full name, roll number, college, branch

### Hackathons
- Dedicated hackathons page
- Registration with full details

### Dashboards
- **Student Dashboard**: Registered events, hackathon registrations
- **College Dashboard**: Event management based on role permissions, user verification (Principal only)
- **Admin Dashboard**: Full user management, event management, verification control

---

## 🗄️ Backend (Lovable Cloud)

### Database Structure
- `profiles` table with roll_number, college_id, branch, is_verified fields
- `user_roles` table for college roles
- `events` table with college ownership
- `hackathon_registrations` for event/hackathon signups
- ~~opportunities table~~ (removed - no jobs/internships)

### Security
- Row Level Security (RLS) policies based on user roles
- Verification hierarchy: Admin → Principal → Other college roles
- Only verified users can access dashboard features

---

## 📱 User Experience

- Clean, modern design with dark navy/orange theme
- Responsive layout (mobile-friendly)
- Toast notifications for actions
- Password strength validation
- Verification pending message for unverified users
