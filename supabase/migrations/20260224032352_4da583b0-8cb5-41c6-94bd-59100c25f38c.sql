
-- profiles
DROP POLICY "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

-- tickets
DROP POLICY "Users can insert their own tickets" ON public.tickets;
CREATE POLICY "Users can insert their own tickets" ON public.tickets FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update tickets" ON public.tickets;
CREATE POLICY "Users can update tickets" ON public.tickets FOR UPDATE USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

DROP POLICY "Users can delete tickets" ON public.tickets;
CREATE POLICY "Users can delete tickets" ON public.tickets FOR DELETE USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

-- ticket_templates
DROP POLICY "Users can view their own templates" ON public.ticket_templates;
CREATE POLICY "Users can view their own templates" ON public.ticket_templates FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY "Users can insert their own templates" ON public.ticket_templates;
CREATE POLICY "Users can insert their own templates" ON public.ticket_templates FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update their own templates" ON public.ticket_templates;
CREATE POLICY "Users can update their own templates" ON public.ticket_templates FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can delete their own templates" ON public.ticket_templates;
CREATE POLICY "Users can delete their own templates" ON public.ticket_templates FOR DELETE USING ((select auth.uid()) = user_id);

-- audit_logs
DROP POLICY "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Users can view audit logs" ON public.audit_logs FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

-- products
DROP POLICY "Users can insert products" ON public.products;
CREATE POLICY "Users can insert products" ON public.products FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update products" ON public.products;
CREATE POLICY "Users can update products" ON public.products FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can delete products" ON public.products;
CREATE POLICY "Users can delete products" ON public.products FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can view products" ON public.products;
CREATE POLICY "Users can view products" ON public.products FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

-- customers
DROP POLICY "Users can insert customers" ON public.customers;
CREATE POLICY "Users can insert customers" ON public.customers FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update customers" ON public.customers;
CREATE POLICY "Users can update customers" ON public.customers FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can delete customers" ON public.customers;
CREATE POLICY "Users can delete customers" ON public.customers FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can view customers" ON public.customers;
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

-- trucks
DROP POLICY "Users can insert trucks" ON public.trucks;
CREATE POLICY "Users can insert trucks" ON public.trucks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update trucks" ON public.trucks;
CREATE POLICY "Users can update trucks" ON public.trucks FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can delete trucks" ON public.trucks;
CREATE POLICY "Users can delete trucks" ON public.trucks FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY "Users can view trucks" ON public.trucks;
CREATE POLICY "Users can view trucks" ON public.trucks FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

-- user_roles
DROP POLICY "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin_or_manager((select auth.uid())));

DROP POLICY "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role((select auth.uid()), 'admin'::app_role));
