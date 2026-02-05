-- Add 'host' to college_role enum
ALTER TYPE college_role ADD VALUE IF NOT EXISTS 'host';

-- Create event_permissions table for granular access control
CREATE TABLE public.event_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view_registrations', 'edit_event', 'manage_event', 'full_access')),
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  UNIQUE(event_id, user_id, permission_type)
);

-- Enable RLS
ALTER TABLE public.event_permissions ENABLE ROW LEVEL SECURITY;

-- Create function to check if user can grant permissions
CREATE OR REPLACE FUNCTION public.can_grant_event_permission(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admin or platform admin
    public.is_super_admin(_user_id) OR
    public.is_admin(_user_id) OR
    -- Event creator
    EXISTS (SELECT 1 FROM events WHERE id = _event_id AND created_by = _user_id) OR
    -- Principal or Dean
    public.has_college_role(_user_id, 'principal') OR
    public.has_college_role(_user_id, 'dean') OR
    -- Staff coordinator (can grant to student coordinators)
    public.has_college_role(_user_id, 'staff_coordinator')
$$;

-- Create function to check if user has specific event permission
CREATE OR REPLACE FUNCTION public.has_event_permission(_user_id uuid, _event_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admin has all permissions
    public.is_super_admin(_user_id) OR
    public.is_admin(_user_id) OR
    -- Principal/Dean have all permissions
    public.has_college_role(_user_id, 'principal') OR
    public.has_college_role(_user_id, 'dean') OR
    -- Event creator has all permissions
    EXISTS (SELECT 1 FROM events WHERE id = _event_id AND created_by = _user_id) OR
    -- Check explicit permission grant
    EXISTS (
      SELECT 1 FROM event_permissions 
      WHERE event_id = _event_id 
        AND user_id = _user_id 
        AND (permission_type = _permission OR permission_type = 'full_access')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
$$;

-- RLS policies for event_permissions
CREATE POLICY "Users can view their own permissions"
ON public.event_permissions FOR SELECT
USING (user_id = auth.uid() OR public.can_grant_event_permission(auth.uid(), event_id));

CREATE POLICY "Authorized users can grant permissions"
ON public.event_permissions FOR INSERT
WITH CHECK (public.can_grant_event_permission(auth.uid(), event_id));

CREATE POLICY "Authorized users can update permissions"
ON public.event_permissions FOR UPDATE
USING (public.can_grant_event_permission(auth.uid(), event_id));

CREATE POLICY "Authorized users can revoke permissions"
ON public.event_permissions FOR DELETE
USING (public.can_grant_event_permission(auth.uid(), event_id));

-- Update event_registrations policy to include permission-based access
DROP POLICY IF EXISTS "Users can view own registrations" ON public.event_registrations;

CREATE POLICY "Users can view registrations with permission"
ON public.event_registrations FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_admin(auth.uid()) OR
  public.is_super_admin(auth.uid()) OR
  public.has_admin_college_role(auth.uid()) OR
  public.has_event_permission(auth.uid(), event_id, 'view_registrations')
);

-- Add index for performance
CREATE INDEX idx_event_permissions_user ON public.event_permissions(user_id);
CREATE INDEX idx_event_permissions_event ON public.event_permissions(event_id);