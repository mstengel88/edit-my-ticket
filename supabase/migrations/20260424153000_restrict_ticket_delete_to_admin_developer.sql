-- Limit ticket deletion to admin and developer roles only.

DROP POLICY IF EXISTS "Admins and managers can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete tickets" ON public.tickets;

CREATE POLICY "Admins and developers can delete tickets"
ON public.tickets
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'developer')
  )
);
