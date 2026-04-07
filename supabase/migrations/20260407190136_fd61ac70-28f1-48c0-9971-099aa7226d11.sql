-- Update products SELECT policy to allow all authenticated users to view all products
DROP POLICY IF EXISTS "Users can view products" ON public.products;
CREATE POLICY "All authenticated users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- Also update INSERT policy so any authenticated user can add products
DROP POLICY IF EXISTS "Users can insert products" ON public.products;
CREATE POLICY "All authenticated users can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update trucks SELECT policy similarly
DROP POLICY IF EXISTS "Users can view trucks" ON public.trucks;
CREATE POLICY "All authenticated users can view trucks"
ON public.trucks
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert trucks" ON public.trucks;
CREATE POLICY "All authenticated users can insert trucks"
ON public.trucks
FOR INSERT
TO authenticated
WITH CHECK (true);