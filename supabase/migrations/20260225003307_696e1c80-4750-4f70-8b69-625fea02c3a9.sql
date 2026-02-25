
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'feature',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id OR is_admin_or_manager(auth.uid()));
