
-- Products lookup table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'manual',
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete products" ON public.products FOR DELETE USING (auth.uid() = user_id);

-- Customers lookup table
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, user_id)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update customers" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete customers" ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- Trucks lookup table
CREATE TABLE public.trucks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, user_id)
);
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view trucks" ON public.trucks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert trucks" ON public.trucks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update trucks" ON public.trucks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete trucks" ON public.trucks FOR DELETE USING (auth.uid() = user_id);
