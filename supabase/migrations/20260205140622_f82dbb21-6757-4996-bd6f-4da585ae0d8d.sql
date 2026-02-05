-- Fix function search path security warnings
ALTER FUNCTION public.generate_certificate_id() SET search_path = public;
ALTER FUNCTION public.generate_invite_code() SET search_path = public;
ALTER FUNCTION public.set_team_invite_code() SET search_path = public;
ALTER FUNCTION public.set_registration_qr() SET search_path = public;

-- Fix overly permissive RLS policies for notifications and audit_logs
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;

-- Replace with authenticated user policies
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);