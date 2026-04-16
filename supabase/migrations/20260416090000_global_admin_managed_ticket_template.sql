-- Promote the developer account's latest template to the shared template.
-- Everyone reads this template for printing; only admins/developers can change it.

DO $$
DECLARE
  developer_user_id uuid := '46c4375d-6d33-4962-9c77-c63fe1ba71d1';
  shared_template_id uuid;
BEGIN
  SELECT id
  INTO shared_template_id
  FROM public.ticket_templates
  WHERE name = 'Global Print Template'
  ORDER BY updated_at DESC, created_at DESC
  LIMIT 1;

  IF shared_template_id IS NULL THEN
    SELECT id
    INTO shared_template_id
    FROM public.ticket_templates
    WHERE user_id = developer_user_id
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1;
  END IF;

  IF shared_template_id IS NOT NULL THEN
    UPDATE public.ticket_templates
    SET name = 'Global Print Template'
    WHERE id = shared_template_id;

    UPDATE public.ticket_templates
    SET name = 'Archived Template ' || id::text
    WHERE name = 'Global Print Template'
      AND id <> shared_template_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_templates_one_global_print_template
ON public.ticket_templates (name)
WHERE name = 'Global Print Template';

DROP POLICY IF EXISTS "Users can view their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Anyone can view templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.ticket_templates;

CREATE POLICY "Everyone can view ticket templates"
ON public.ticket_templates
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert ticket templates"
ON public.ticket_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role::text IN ('admin', 'developer')
  )
);

CREATE POLICY "Admins can update ticket templates"
ON public.ticket_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role::text IN ('admin', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role::text IN ('admin', 'developer')
  )
);

CREATE POLICY "Admins can delete ticket templates"
ON public.ticket_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role::text IN ('admin', 'developer')
  )
);

DROP POLICY IF EXISTS "Users can view their own versions" ON public.template_versions;
DROP POLICY IF EXISTS "Users can insert their own versions" ON public.template_versions;
DROP POLICY IF EXISTS "Users can delete their own versions" ON public.template_versions;
DROP POLICY IF EXISTS "Anyone can view versions" ON public.template_versions;
DROP POLICY IF EXISTS "Admins can insert versions" ON public.template_versions;
DROP POLICY IF EXISTS "Admins can delete versions" ON public.template_versions;

CREATE POLICY "Everyone can view template versions"
ON public.template_versions
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert template versions"
ON public.template_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role::text IN ('admin', 'developer')
  )
);

CREATE POLICY "Admins can delete template versions"
ON public.template_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role::text IN ('admin', 'developer')
  )
);
