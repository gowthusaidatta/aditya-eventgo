-- Create a function to create admin user
-- This will be used to set up the initial admin
-- The admin will need to sign up normally first, then we update their profile

-- Note: To create the admin user, you need to:
-- 1. Sign up with email: Datta@gmail.com and password: Datta@1235
-- 2. Run this SQL to update the profile to admin type

-- For now, let's create a helper function that admins can use
CREATE OR REPLACE FUNCTION public.promote_to_admin(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user_id from profiles
  SELECT user_id INTO _user_id FROM profiles WHERE email = _email;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', _email;
  END IF;
  
  -- Update the user_type to admin
  UPDATE profiles SET user_type = 'admin', is_verified = true WHERE user_id = _user_id;
END;
$$;