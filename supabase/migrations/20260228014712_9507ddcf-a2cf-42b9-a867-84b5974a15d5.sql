
DROP POLICY "Admins can delete roles" ON public.user_roles;
DROP POLICY "Admins can insert roles" ON public.user_roles;
DROP POLICY "Admins can update roles" ON public.user_roles;

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid()));
