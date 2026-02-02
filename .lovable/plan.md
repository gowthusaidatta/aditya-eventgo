

# EventGo - Aditya University Collaboration

An event management platform for colleges, students, and companies to connect through events, hackathons, jobs, and internships.

---

## 🎨 Branding & Design

### Dual Logo Header
- Display both **EventGo** logo and **Aditya University** logo in the header
- Logos appear side-by-side with "in collaboration with" text
- Professional styling that works on both light and dark backgrounds

---

## 👥 User Roles & Signup

### Student Signup
- Full name, email, password
- College name, graduation year
- Phone number (optional)
- Access to browse events, register for opportunities

### College Signup (New Role System)
During college signup, user selects their role:

| Role | Permissions |
|------|-------------|
| **Principal** | Full access: Create, edit, delete events • Manage all registrations • View analytics & reports |
| **Dean** | Full access: Same as Principal |
| **Staff Coordinator** | Create events • Manage registrations • View all college events |
| **Student Coordinator** | View-only access • See registrations only for events they're involved in |

### Company Signup
- Organization name, email, password
- Post jobs, internships, and opportunities

---

## 🏠 Core Features

### Landing Page
- Hero section with both logos
- Featured events carousel
- Featured opportunities (jobs, internships)
- Call-to-action for signup

### Events System
- Browse and discover events
- Event details page with registration
- Event categories (workshops, seminars, fests)

### Opportunities Hub
- Jobs listings
- Internships listings
- Hackathons

### Dashboards
- **Student Dashboard**: Registered events, saved opportunities
- **College Dashboard**: Event management based on role permissions
- **Admin Dashboard**: Platform-wide management

---

## 🗄️ Backend (Supabase)

### Database Structure
- User profiles with role information
- Separate `user_roles` table for college roles (Principal, Dean, Staff Coordinator, Student Coordinator)
- Events table with college ownership
- Registrations tracking
- Opportunities (jobs, internships) tables

### Security
- Row Level Security (RLS) policies based on user roles
- Role-based permissions enforced at database level
- Secure authentication flow

---

## 📱 User Experience

- Clean, modern design with Tailwind CSS
- Responsive layout (mobile-friendly)
- Toast notifications for actions
- Password strength validation
- Profile management with photo upload

