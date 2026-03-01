-- Tighten UPDATE policy to require authenticated user
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.ticket_templates;
CREATE POLICY "Authenticated users can update templates"
  ON public.ticket_templates FOR UPDATE
  USING (auth.uid() IS NOT NULL);