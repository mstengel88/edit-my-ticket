-- Restrict default "user" accounts to tickets-only, read-only access.

-- tickets
DROP POLICY IF EXISTS "Users can insert their own tickets" ON public.tickets;
CREATE POLICY "Admins and managers can insert tickets"
ON public.tickets FOR INSERT
WITH CHECK (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update tickets" ON public.tickets;
CREATE POLICY "Admins and managers can update tickets"
ON public.tickets FOR UPDATE
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete tickets" ON public.tickets;
CREATE POLICY "Admins and managers can delete tickets"
ON public.tickets FOR DELETE
USING (public.is_admin_or_manager((SELECT auth.uid())));

-- customers
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "Admins and managers can view customers"
ON public.customers FOR SELECT
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
CREATE POLICY "Admins and managers can insert customers"
ON public.customers FOR INSERT
WITH CHECK (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
CREATE POLICY "Admins and managers can update customers"
ON public.customers FOR UPDATE
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;
CREATE POLICY "Admins and managers can delete customers"
ON public.customers FOR DELETE
USING (public.is_admin_or_manager((SELECT auth.uid())));

-- products
DROP POLICY IF EXISTS "Users can view products" ON public.products;
CREATE POLICY "Admins and managers can view products"
ON public.products FOR SELECT
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert products" ON public.products;
CREATE POLICY "Admins and managers can insert products"
ON public.products FOR INSERT
WITH CHECK (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update products" ON public.products;
CREATE POLICY "Admins and managers can update products"
ON public.products FOR UPDATE
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete products" ON public.products;
CREATE POLICY "Admins and managers can delete products"
ON public.products FOR DELETE
USING (public.is_admin_or_manager((SELECT auth.uid())));

-- trucks
DROP POLICY IF EXISTS "Users can view trucks" ON public.trucks;
CREATE POLICY "Admins and managers can view trucks"
ON public.trucks FOR SELECT
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert trucks" ON public.trucks;
CREATE POLICY "Admins and managers can insert trucks"
ON public.trucks FOR INSERT
WITH CHECK (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update trucks" ON public.trucks;
CREATE POLICY "Admins and managers can update trucks"
ON public.trucks FOR UPDATE
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete trucks" ON public.trucks;
CREATE POLICY "Admins and managers can delete trucks"
ON public.trucks FOR DELETE
USING (public.is_admin_or_manager((SELECT auth.uid())));

-- feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Admins and managers can view feedback"
ON public.feedback FOR SELECT
USING (public.is_admin_or_manager((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Admins and managers can insert feedback"
ON public.feedback FOR INSERT
WITH CHECK (public.is_admin_or_manager((SELECT auth.uid())));
