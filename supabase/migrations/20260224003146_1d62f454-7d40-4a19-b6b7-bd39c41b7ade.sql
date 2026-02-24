-- Fix profiles SELECT policy so admins/managers can see all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles"
  ON public.profiles
  FOR SELECT
  USING ((auth.uid() = user_id) OR is_admin_or_manager(auth.uid()));

-- Insert missing role for bossman (mike@greenhillswi.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('48adee4d-50d0-4d88-be9e-f3930ba898db', 'user')
ON CONFLICT DO NOTHING;