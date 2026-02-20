
-- Create tickets table to persist Loadrite data
CREATE TABLE public.tickets (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  job_name TEXT NOT NULL DEFAULT 'Job',
  date_time TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'Green Hills Supply',
  company_email TEXT NOT NULL DEFAULT 'order@greenhillsupply.com',
  company_website TEXT NOT NULL DEFAULT 'www.GreenHillsSupply.com',
  company_phone TEXT NOT NULL DEFAULT '262-345-4001',
  total_amount TEXT NOT NULL DEFAULT '0.00',
  total_unit TEXT NOT NULL DEFAULT 'Ton',
  customer TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  truck TEXT NOT NULL DEFAULT '-',
  note TEXT NOT NULL DEFAULT '',
  bucket TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_address TEXT NOT NULL DEFAULT '',
  signature TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets"
ON public.tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.tickets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tickets"
ON public.tickets FOR DELETE
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
