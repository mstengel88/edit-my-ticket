
CREATE POLICY "Admins and managers can update feedback status"
ON public.feedback FOR UPDATE
USING (is_admin_or_manager((SELECT auth.uid())));
