alter table public.tickets
add column if not exists source text not null default 'manual';

update public.tickets
set source = case
  when order_id is not null then 'manual'
  when job_number like 'MT-%' then 'manual'
  else 'loadrite'
end;

create index if not exists idx_tickets_source on public.tickets (source);
