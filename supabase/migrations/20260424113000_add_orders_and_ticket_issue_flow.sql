CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer text NOT NULL,
  customer_email text NOT NULL DEFAULT '',
  product text NOT NULL,
  po_number text NOT NULL DEFAULT '',
  job_address text NOT NULL DEFAULT '',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_unit text NOT NULL DEFAULT 'Yardage',
  ticket_count integer NOT NULL DEFAULT 1 CHECK (ticket_count > 0),
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
CREATE POLICY "Users can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
CREATE POLICY "Users can insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users can update orders" ON public.orders;
CREATE POLICY "Users can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "Users can delete orders" ON public.orders;
CREATE POLICY "Users can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin_or_manager(auth.uid()));

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_sequence integer,
ADD COLUMN IF NOT EXISTS issued_at timestamp with time zone;
