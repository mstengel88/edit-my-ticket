
DROP POLICY "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Users can insert their own feedback" ON public.feedback FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));
