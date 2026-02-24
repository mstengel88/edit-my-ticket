
-- Assign admin role to both existing admin users (replace default 'user' role)
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('46c4375d-6d33-4962-9c77-c63fe1ba71d1', 'admin'),
  ('b9438690-e79b-4f4a-9d70-657c52e00588', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove default 'user' role for these users if it exists
DELETE FROM public.user_roles
WHERE user_id IN ('46c4375d-6d33-4962-9c77-c63fe1ba71d1', 'b9438690-e79b-4f4a-9d70-657c52e00588')
AND role = 'user';
