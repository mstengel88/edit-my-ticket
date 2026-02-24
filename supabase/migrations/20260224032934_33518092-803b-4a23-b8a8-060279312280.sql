
-- Add index for tickets.user_id foreign key
CREATE INDEX idx_tickets_user_id ON public.tickets (user_id);

-- Remove unused index
DROP INDEX IF EXISTS public.idx_audit_logs_entity;
