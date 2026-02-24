
-- Allow all authenticated users to view all tickets
DROP POLICY IF EXISTS "Users can view tickets" ON public.tickets;
CREATE POLICY "Users can view tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (true);
