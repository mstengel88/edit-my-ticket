
-- Drop existing per-user RLS policies on ticket_templates
DROP POLICY IF EXISTS "Users can view their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.ticket_templates;

-- New policies: everyone can read, only admins/managers can modify
CREATE POLICY "Anyone can view templates"
  ON public.ticket_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert templates"
  ON public.ticket_templates FOR INSERT
  WITH CHECK (is_admin_or_manager((SELECT auth.uid())));

CREATE POLICY "Admins can update templates"
  ON public.ticket_templates FOR UPDATE
  USING (is_admin_or_manager((SELECT auth.uid())));

CREATE POLICY "Admins can delete templates"
  ON public.ticket_templates FOR DELETE
  USING (is_admin_or_manager((SELECT auth.uid())));

-- Same for template_versions
DROP POLICY IF EXISTS "Users can view their own versions" ON public.template_versions;
DROP POLICY IF EXISTS "Users can insert their own versions" ON public.template_versions;
DROP POLICY IF EXISTS "Users can delete their own versions" ON public.template_versions;

CREATE POLICY "Anyone can view versions"
  ON public.template_versions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert versions"
  ON public.template_versions FOR INSERT
  WITH CHECK (is_admin_or_manager((SELECT auth.uid())));

CREATE POLICY "Admins can delete versions"
  ON public.template_versions FOR DELETE
  USING (is_admin_or_manager((SELECT auth.uid())));
