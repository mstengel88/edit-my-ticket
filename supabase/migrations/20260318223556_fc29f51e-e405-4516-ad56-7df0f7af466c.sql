
-- Deduplicate customers: keep the row with an email (or the oldest) for each name
DELETE FROM public.customers
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM public.customers
  ORDER BY name, 
    CASE WHEN email != '' AND email IS NOT NULL THEN 0 ELSE 1 END,
    created_at ASC
);

-- Drop old per-user unique constraint
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_name_user_id_key;

-- Add global unique constraint on name only
ALTER TABLE public.customers ADD CONSTRAINT customers_name_key UNIQUE (name);

-- Update RLS: allow all authenticated users to view all customers
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "All authenticated users can view customers"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

-- Allow all authenticated users to insert customers
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
CREATE POLICY "All authenticated users can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update customers
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
CREATE POLICY "All authenticated users can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (true);

-- Allow all authenticated users to delete customers
DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;
CREATE POLICY "All authenticated users can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (true);
