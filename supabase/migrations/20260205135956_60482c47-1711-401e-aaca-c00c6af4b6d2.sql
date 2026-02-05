-- =====================================================
-- EVENTGO PLATFORM - COMPREHENSIVE SCHEMA MIGRATION
-- =====================================================

-- 1. CREATE NEW ENUMS
-- =====================================================

-- New expanded role type for all platform roles
CREATE TYPE public.platform_role AS ENUM (
  'super_admin',
  'organizer',
  'participant',
  'judge',
  'mentor',
  'volunteer'
);

-- Event mode type
CREATE TYPE public.event_mode AS ENUM ('online', 'offline', 'hybrid');

-- Event status
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');

-- Registration status
CREATE TYPE public.registration_status AS ENUM ('pending', 'confirmed', 'waitlisted', 'cancelled', 'attended');

-- Team status
CREATE TYPE public.team_status AS ENUM ('forming', 'complete', 'competing', 'disqualified', 'winner');

-- Submission status
CREATE TYPE public.submission_status AS ENUM ('draft', 'submitted', 'under_review', 'evaluated', 'finalist');

-- Payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- Certificate type
CREATE TYPE public.certificate_type AS ENUM ('participation', 'winner', 'runner_up', 'appreciation', 'volunteer', 'mentor', 'judge');

-- Hackathon round type
CREATE TYPE public.hackathon_round AS ENUM ('idea', 'prototype', 'semifinal', 'final');

-- Invite status
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- 2. PLATFORM ROLES TABLE (NEW EXPANDED ROLES)
-- =====================================================
CREATE TABLE public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role platform_role NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role, event_id)
);

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- 3. EVENT ENHANCEMENTS
-- =====================================================
-- Add new columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS mode event_mode DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS status event_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waitlist_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS venue_details JSONB,
ADD COLUMN IF NOT EXISTS online_link TEXT,
ADD COLUMN IF NOT EXISTS is_hackathon BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team_size_min INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS team_size_max INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS prizes JSONB,
ADD COLUMN IF NOT EXISTS sponsors JSONB,
ADD COLUMN IF NOT EXISTS faqs JSONB;

-- 4. EVENT SCHEDULE/AGENDA
-- =====================================================
CREATE TABLE public.event_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  speaker_name TEXT,
  speaker_bio TEXT,
  speaker_image TEXT,
  session_type TEXT DEFAULT 'session',
  day_number INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.event_schedule ENABLE ROW LEVEL SECURITY;

-- 5. DYNAMIC REGISTRATION FORMS
-- =====================================================
CREATE TABLE public.registration_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  form_schema JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.registration_forms ENABLE ROW LEVEL SECURITY;

-- 6. ENHANCED EVENT REGISTRATIONS
-- =====================================================
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS registration_status registration_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS form_responses JSONB,
ADD COLUMN IF NOT EXISTS payment_id UUID,
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_by UUID,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

-- 7. TEAMS TABLE (FOR HACKATHONS)
-- =====================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID NOT NULL,
  invite_code TEXT UNIQUE,
  status team_status DEFAULT 'forming',
  problem_statement_id UUID,
  mentor_id UUID,
  current_round hackathon_round DEFAULT 'idea',
  total_score DECIMAL(10,2) DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 8. TEAM MEMBERS
-- =====================================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 9. TEAM INVITES
-- =====================================================
CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status invite_status DEFAULT 'pending',
  token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- 10. PROBLEM STATEMENTS
-- =====================================================
CREATE TABLE public.problem_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  difficulty TEXT DEFAULT 'medium',
  max_teams INTEGER,
  resources JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.problem_statements ENABLE ROW LEVEL SECURITY;

-- Add foreign key to teams
ALTER TABLE public.teams 
ADD CONSTRAINT teams_problem_statement_fkey 
FOREIGN KEY (problem_statement_id) REFERENCES public.problem_statements(id) ON DELETE SET NULL;

-- 11. SUBMISSIONS
-- =====================================================
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round hackathon_round NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  github_url TEXT,
  demo_url TEXT,
  video_url TEXT,
  drive_link TEXT,
  file_urls TEXT[],
  status submission_status DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 12. JUDGING RUBRICS
-- =====================================================
CREATE TABLE public.judging_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round hackathon_round,
  criteria_name TEXT NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL DEFAULT 10,
  weight DECIMAL(3,2) DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.judging_rubrics ENABLE ROW LEVEL SECURITY;

-- 13. JUDGE SCORES
-- =====================================================
CREATE TABLE public.judge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL,
  rubric_id UUID NOT NULL REFERENCES public.judging_rubrics(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  feedback TEXT,
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(submission_id, judge_id, rubric_id)
);

ALTER TABLE public.judge_scores ENABLE ROW LEVEL SECURITY;

-- 14. PAYMENTS
-- =====================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status payment_status DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  coupon_code TEXT,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  invoice_number TEXT UNIQUE,
  invoice_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 15. COUPON CODES
-- =====================================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  min_amount DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 16. CERTIFICATES
-- =====================================================
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  type certificate_type NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  issue_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  template_data JSONB,
  pdf_url TEXT,
  qr_code_url TEXT,
  verification_url TEXT,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 17. NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 18. AUDIT LOGS
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 19. SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Check if user has a platform role
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id UUID, _role platform_role, _event_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (event_id IS NULL OR event_id = _event_id OR _event_id IS NULL)
  )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
      AND is_active = true
  ) OR public.is_admin(_user_id)
$$;

-- Check if user is event organizer
CREATE OR REPLACE FUNCTION public.is_event_organizer(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events WHERE id = _event_id AND created_by = _user_id
  ) OR public.has_platform_role(_user_id, 'organizer', _event_id)
    OR public.is_super_admin(_user_id)
$$;

-- Check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Check if user is team leader
CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = _team_id AND leader_id = _user_id
  )
$$;

-- Generate unique certificate ID
CREATE OR REPLACE FUNCTION public.generate_certificate_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  prefix TEXT := 'EVTGO';
BEGIN
  new_id := prefix || '-' || TO_CHAR(NOW(), 'YYMM') || '-' || 
            UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
  RETURN new_id;
END;
$$;

-- Generate team invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
END;
$$;

-- Auto-generate invite code on team creation
CREATE OR REPLACE FUNCTION public.set_team_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_team_invite_code_trigger
BEFORE INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.set_team_invite_code();

-- Auto-generate QR code for registration
CREATE OR REPLACE FUNCTION public.set_registration_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := 'REG-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_registration_qr_trigger
BEFORE INSERT ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_registration_qr();

-- 20. RLS POLICIES
-- =====================================================

-- Platform Roles Policies
CREATE POLICY "Users can view their own roles"
ON public.platform_roles FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all roles"
ON public.platform_roles FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Event Schedule Policies
CREATE POLICY "Anyone can view event schedules"
ON public.event_schedule FOR SELECT USING (true);

CREATE POLICY "Organizers can manage schedules"
ON public.event_schedule FOR ALL
USING (public.is_event_organizer(auth.uid(), event_id));

-- Registration Forms Policies
CREATE POLICY "Anyone can view active forms"
ON public.registration_forms FOR SELECT USING (is_active = true);

CREATE POLICY "Organizers can manage forms"
ON public.registration_forms FOR ALL
USING (public.is_event_organizer(auth.uid(), event_id));

-- Teams Policies
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can update their team"
ON public.teams FOR UPDATE
USING (public.is_team_leader(auth.uid(), id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Team leaders can delete their team"
ON public.teams FOR DELETE
USING (public.is_team_leader(auth.uid(), id) OR public.is_super_admin(auth.uid()));

-- Team Members Policies
CREATE POLICY "Anyone can view team members"
ON public.team_members FOR SELECT USING (true);

CREATE POLICY "Team leaders can add members"
ON public.team_members FOR INSERT
WITH CHECK (public.is_team_leader(auth.uid(), team_id));

CREATE POLICY "Team leaders can remove members"
ON public.team_members FOR DELETE
USING (public.is_team_leader(auth.uid(), team_id) OR user_id = auth.uid());

-- Team Invites Policies
CREATE POLICY "Invitees can view their invites"
ON public.team_invites FOR SELECT
USING (invited_email IN (SELECT email FROM profiles WHERE user_id = auth.uid()) 
       OR public.is_team_leader(auth.uid(), team_id));

CREATE POLICY "Team leaders can send invites"
ON public.team_invites FOR INSERT
WITH CHECK (public.is_team_leader(auth.uid(), team_id));

CREATE POLICY "Anyone can update invite status"
ON public.team_invites FOR UPDATE
USING (invited_email IN (SELECT email FROM profiles WHERE user_id = auth.uid()));

-- Problem Statements Policies
CREATE POLICY "Anyone can view problem statements"
ON public.problem_statements FOR SELECT USING (is_active = true);

CREATE POLICY "Organizers can manage problem statements"
ON public.problem_statements FOR ALL
USING (public.is_event_organizer(auth.uid(), event_id));

-- Submissions Policies
CREATE POLICY "Team members can view their submissions"
ON public.submissions FOR SELECT
USING (public.is_team_member(auth.uid(), team_id) 
       OR public.is_event_organizer(auth.uid(), event_id)
       OR public.has_platform_role(auth.uid(), 'judge', event_id));

CREATE POLICY "Team members can create submissions"
ON public.submissions FOR INSERT
WITH CHECK (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can update submissions"
ON public.submissions FOR UPDATE
USING (public.is_team_member(auth.uid(), team_id) AND status IN ('draft', 'submitted'));

-- Judging Rubrics Policies
CREATE POLICY "Anyone can view rubrics"
ON public.judging_rubrics FOR SELECT USING (true);

CREATE POLICY "Organizers can manage rubrics"
ON public.judging_rubrics FOR ALL
USING (public.is_event_organizer(auth.uid(), event_id));

-- Judge Scores Policies
CREATE POLICY "Judges can view and add scores"
ON public.judge_scores FOR SELECT
USING (judge_id = auth.uid() OR public.is_event_organizer(auth.uid(), 
       (SELECT event_id FROM submissions WHERE id = submission_id)));

CREATE POLICY "Judges can add scores"
ON public.judge_scores FOR INSERT
WITH CHECK (public.has_platform_role(auth.uid(), 'judge', 
            (SELECT event_id FROM submissions WHERE id = submission_id)));

CREATE POLICY "Judges can update their scores"
ON public.judge_scores FOR UPDATE
USING (judge_id = auth.uid());

-- Payments Policies
CREATE POLICY "Users can view their payments"
ON public.payments FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "System can create payments"
ON public.payments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- Coupons Policies
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT USING (is_active = true);

CREATE POLICY "Organizers can manage coupons"
ON public.coupons FOR ALL
USING (public.is_super_admin(auth.uid()) OR public.is_event_organizer(auth.uid(), event_id));

-- Certificates Policies
CREATE POLICY "Users can view their certificates"
ON public.certificates FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Public certificate verification"
ON public.certificates FOR SELECT
USING (is_valid = true);

CREATE POLICY "Admins can manage certificates"
ON public.certificates FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Notifications Policies
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "System can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- 21. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_platform_roles_user ON public.platform_roles(user_id);
CREATE INDEX idx_platform_roles_event ON public.platform_roles(event_id);
CREATE INDEX idx_teams_event ON public.teams(event_id);
CREATE INDEX idx_teams_leader ON public.teams(leader_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_submissions_team ON public.submissions(team_id);
CREATE INDEX idx_submissions_event ON public.submissions(event_id);
CREATE INDEX idx_judge_scores_submission ON public.judge_scores(submission_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_event ON public.payments(event_id);
CREATE INDEX idx_certificates_user ON public.certificates(user_id);
CREATE INDEX idx_certificates_event ON public.certificates(event_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_hackathon ON public.events(is_hackathon) WHERE is_hackathon = true;