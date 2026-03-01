-- Allow all authenticated users to insert and update ticket_templates
DROP POLICY IF EXISTS "Admins can insert templates" ON public.ticket_templates;
CREATE POLICY "Authenticated users can insert templates"
  ON public.ticket_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update templates" ON public.ticket_templates;
CREATE POLICY "Authenticated users can update templates"
  ON public.ticket_templates FOR UPDATE
  USING (true);

-- Allow all authenticated users to insert template versions
DROP POLICY IF EXISTS "Admins can insert versions" ON public.template_versions;
CREATE POLICY "Authenticated users can insert versions"
  ON public.template_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);