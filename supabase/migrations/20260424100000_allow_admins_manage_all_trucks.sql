DROP POLICY IF EXISTS "Users can update trucks" ON public.trucks;
DROP POLICY IF EXISTS "Owners or admins can update trucks" ON public.trucks;

CREATE POLICY "Owners or admins can update trucks"
ON public.trucks
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users can delete trucks" ON public.trucks;
DROP POLICY IF EXISTS "Owners or admins can delete trucks" ON public.trucks;

CREATE POLICY "Owners or admins can delete trucks"
ON public.trucks
FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()));
