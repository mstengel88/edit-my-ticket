ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_ticket_count_check;

ALTER TABLE public.orders
  ALTER COLUMN ticket_count SET DEFAULT 0;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_ticket_count_check CHECK (ticket_count >= 0);
