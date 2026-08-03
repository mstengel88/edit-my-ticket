create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.system_settings enable row level security;

drop policy if exists "Authenticated users can view system settings" on public.system_settings;
create policy "Authenticated users can view system settings"
on public.system_settings for select
to authenticated
using (true);

drop policy if exists "Admins can insert system settings" on public.system_settings;
create policy "Admins can insert system settings"
on public.system_settings for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'developer'::public.app_role)
);

drop policy if exists "Admins can update system settings" on public.system_settings;
create policy "Admins can update system settings"
on public.system_settings for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'developer'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'developer'::public.app_role)
);

drop trigger if exists update_system_settings_updated_at on public.system_settings;
create trigger update_system_settings_updated_at
before update on public.system_settings
for each row
execute function public.update_updated_at_column();

insert into public.system_settings (key, value)
values (
  'loadrite_activation',
  '{
    "gatewayUrl": "http://192.168.41.140",
    "username": "sa",
    "activationCodeMasked": "",
    "dealerName": "",
    "deviceSerial": "",
    "siteName": "Green Hills Supply",
    "status": "waiting_for_code",
    "notes": ""
  }'::jsonb
)
on conflict (key) do nothing;
