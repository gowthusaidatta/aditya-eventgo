-- Create enum for user types
CREATE TYPE public.user_type AS ENUM ('student', 'college', 'company', 'admin');

-- Create enum for college roles
CREATE TYPE public.college_role AS ENUM ('principal', 'dean', 'staff_coordinator', 'student_coordinator');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  user_type user_type NOT NULL DEFAULT 'student',
  -- Student specific fields
  college_name TEXT,
  graduation_year INTEGER,
  -- Company specific fields
  organization_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table for college roles (separate as per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role college_role NOT NULL,
  college_id UUID,
  UNIQUE(user_id, role)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'workshop',
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  max_participants INTEGER,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  college_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create event registrations table
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'registered',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Create opportunities table (jobs, internships, hackathons)
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('job', 'internship', 'hackathon')),
  company_name TEXT,
  location TEXT,
  salary_range TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  requirements TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_college_role(_user_id UUID, _role college_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has admin-level college role (principal or dean)
CREATE OR REPLACE FUNCTION public.has_admin_college_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('principal', 'dean')
  )
$$;

-- Create function to get user type
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id UUID)
RETURNS user_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage, users can view own)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles during signup" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Anyone can view events" ON public.events
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "College admins can create events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_admin_college_role(auth.uid()) OR 
    public.has_college_role(auth.uid(), 'staff_coordinator')
  );

CREATE POLICY "College admins can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_admin_college_role(auth.uid())
  );

CREATE POLICY "College admins can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_admin_college_role(auth.uid()));

-- Event registrations policies
CREATE POLICY "Users can view own registrations" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_admin_college_role(auth.uid()) OR
    public.has_college_role(auth.uid(), 'staff_coordinator')
  );

CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own registration" ON public.event_registrations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Opportunities policies
CREATE POLICY "Anyone can view opportunities" ON public.opportunities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Companies can create opportunities" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_type(auth.uid()) = 'company');

CREATE POLICY "Companies can update own opportunities" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Companies can delete own opportunities" ON public.opportunities
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();