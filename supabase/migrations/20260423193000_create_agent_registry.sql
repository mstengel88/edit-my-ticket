create table if not exists public.agent_registry (
  key text primary key,
  label text not null,
  base_url text not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  priority integer not null default 100,
  health_path text not null default '/metrics',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_registry_health_path_check check (left(health_path, 1) = '/')
);

create unique index if not exists agent_registry_one_default_idx
  on public.agent_registry ((is_default))
  where is_default = true;

create or replace function public.set_agent_registry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_registry_updated_at on public.agent_registry;

create trigger set_agent_registry_updated_at
before update on public.agent_registry
for each row
execute function public.set_agent_registry_updated_at();

alter table public.agent_registry enable row level security;

create policy "Developers can read agent registry"
on public.agent_registry
for select
using (public.has_role(auth.uid(), 'developer'));

create policy "Developers can manage agent registry"
on public.agent_registry
for all
using (public.has_role(auth.uid(), 'developer'))
with check (public.has_role(auth.uid(), 'developer'));

insert into public.agent_registry (key, label, base_url, is_active, is_default, priority, health_path)
values
  ('primary', 'Primary', 'https://agent.winterwatch-pro.info', true, true, 10, '/metrics'),
  ('ghstickets', 'GHS Tickets', 'https://agent.ghstickets.com', true, false, 20, '/metrics')
on conflict (key) do update
set
  label = excluded.label,
  base_url = excluded.base_url,
  is_active = excluded.is_active,
  is_default = excluded.is_default,
  priority = excluded.priority,
  health_path = excluded.health_path;
