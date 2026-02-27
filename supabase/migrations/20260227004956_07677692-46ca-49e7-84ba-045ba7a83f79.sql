
CREATE TABLE public.template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.ticket_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  layout jsonb NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own versions"
ON public.template_versions FOR SELECT
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own versions"
ON public.template_versions FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own versions"
ON public.template_versions FOR DELETE
USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_template_versions_template_id ON public.template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON public.template_versions(created_at DESC);
