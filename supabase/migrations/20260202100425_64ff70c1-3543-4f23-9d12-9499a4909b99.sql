-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS college_id TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Remove company from user_type enum and add admin
-- First, update existing company users to student (if any)
UPDATE public.profiles SET user_type = 'student' WHERE user_type = 'company';

-- Create hackathon_registrations table for event/hackathon signups
CREATE TABLE IF NOT EXISTS public.hackathon_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    college_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    status TEXT DEFAULT 'pending',
    UNIQUE(event_id, user_id)
);

-- Enable RLS on hackathon_registrations
ALTER TABLE public.hackathon_registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hackathon_registrations
CREATE POLICY "Users can view own registrations"
ON public.hackathon_registrations
FOR SELECT
USING (
    user_id = auth.uid() 
    OR has_admin_college_role(auth.uid())
    OR has_college_role(auth.uid(), 'staff_coordinator'::college_role)
    OR get_user_type(auth.uid()) = 'admin'::user_type
);

CREATE POLICY "Users can register for events"
ON public.hackathon_registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own registration"
ON public.hackathon_registrations
FOR DELETE
USING (auth.uid() = user_id);

-- Admin/Principal can update any registration
CREATE POLICY "Admins can update registrations"
ON public.hackathon_registrations
FOR UPDATE
USING (
    has_admin_college_role(auth.uid())
    OR get_user_type(auth.uid()) = 'admin'::user_type
);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND user_type = 'admin'
  )
$$;

-- Update profiles policies to allow admin full access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Admin can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Admin can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin(auth.uid()));

-- Update user_roles policies for verification flow
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "View roles policy"
ON public.user_roles
FOR SELECT
USING (
    auth.uid() = user_id 
    OR is_admin(auth.uid())
    OR has_admin_college_role(auth.uid())
);

-- Allow admin and principal to update roles
CREATE POLICY "Admin can update roles"
ON public.user_roles
FOR UPDATE
USING (is_admin(auth.uid()) OR has_admin_college_role(auth.uid()));

-- Allow admin to delete roles
CREATE POLICY "Admin can delete roles"
ON public.user_roles
FOR DELETE
USING (is_admin(auth.uid()));

-- Update events policies for admin
DROP POLICY IF EXISTS "College admins can create events" ON public.events;
DROP POLICY IF EXISTS "College admins can delete events" ON public.events;
DROP POLICY IF EXISTS "College admins can update events" ON public.events;

CREATE POLICY "Authorized users can create events"
ON public.events
FOR INSERT
WITH CHECK (
    has_admin_college_role(auth.uid()) 
    OR has_college_role(auth.uid(), 'staff_coordinator'::college_role)
    OR is_admin(auth.uid())
);

CREATE POLICY "Authorized users can update events"
ON public.events
FOR UPDATE
USING (
    created_by = auth.uid() 
    OR has_admin_college_role(auth.uid())
    OR is_admin(auth.uid())
);

CREATE POLICY "Authorized users can delete events"
ON public.events
FOR DELETE
USING (
    has_admin_college_role(auth.uid())
    OR is_admin(auth.uid())
);

-- Drop opportunities table as we're removing jobs/internships
DROP TABLE IF EXISTS public.opportunities CASCADE;