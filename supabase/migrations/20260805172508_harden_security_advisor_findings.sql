-- Harden the Ticket Creator database surface reported by Supabase's security
-- advisor. Keep RLS helper functions available to authenticated policies while
-- removing them from the exposed public API schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- SECURITY DEFINER helpers are internal implementation details. Moving them
-- preserves policy/trigger dependencies by OID while removing their public RPC
-- endpoints.
alter function public.has_role(uuid, public.app_role) set schema private;
alter function public.is_admin_or_manager(uuid) set schema private;
alter function public.get_user_role(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_new_user_role() set schema private;

alter function private.has_role(uuid, public.app_role) set search_path = '';
alter function private.is_admin_or_manager(uuid) set search_path = '';
alter function private.get_user_role(uuid) set search_path = '';
alter function private.handle_new_user() set search_path = '';
alter function private.handle_new_user_role() set search_path = '';

revoke all on function private.has_role(uuid, public.app_role)
  from public, anon, authenticated;
revoke all on function private.is_admin_or_manager(uuid)
  from public, anon, authenticated;
revoke all on function private.get_user_role(uuid)
  from public, anon, authenticated;
revoke all on function private.handle_new_user()
  from public, anon, authenticated;
revoke all on function private.handle_new_user_role()
  from public, anon, authenticated;

-- RLS policies need the two role predicates, but neither helper is exposed
-- through PostgREST because the private schema is not an API schema.
grant execute on function private.has_role(uuid, public.app_role)
  to authenticated, service_role;
grant execute on function private.is_admin_or_manager(uuid)
  to authenticated, service_role;
grant execute on function private.get_user_role(uuid)
  to service_role;
grant execute on function private.handle_new_user()
  to service_role;
grant execute on function private.handle_new_user_role()
  to service_role;

-- Trigger-only functions do not need to be callable through the Data API.
alter function public.set_agent_registry_updated_at() set search_path = '';
alter function public.set_dispatch_orders_updated_at() set search_path = '';
alter function public.set_dispatch_routes_updated_at() set search_path = '';
alter function public.set_truck_normalized_name() set search_path = '';

revoke all on function public.set_agent_registry_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_dispatch_orders_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_dispatch_routes_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_truck_normalized_name()
  from public, anon, authenticated;

grant execute on function public.set_agent_registry_updated_at()
  to service_role;
grant execute on function public.set_dispatch_orders_updated_at()
  to service_role;
grant execute on function public.set_dispatch_routes_updated_at()
  to service_role;
grant execute on function public.set_truck_normalized_name()
  to service_role;

-- Remove historical permissive policies that continued to override the later
-- manager-only policies. Recreate the intended policies with an explicit role
-- target and complete UPDATE checks.
drop policy if exists "All authenticated users can view customers"
  on public.customers;
drop policy if exists "All authenticated users can insert customers"
  on public.customers;
drop policy if exists "All authenticated users can update customers"
  on public.customers;
drop policy if exists "All authenticated users can delete customers"
  on public.customers;

drop policy if exists "Admins and managers can view customers"
  on public.customers;
drop policy if exists "Admins and managers can insert customers"
  on public.customers;
drop policy if exists "Admins and managers can update customers"
  on public.customers;
drop policy if exists "Admins and managers can delete customers"
  on public.customers;

create policy "Admins and managers can view customers"
on public.customers for select
to authenticated
using ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can insert customers"
on public.customers for insert
to authenticated
with check ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can update customers"
on public.customers for update
to authenticated
using ((select private.is_admin_or_manager(auth.uid())))
with check ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can delete customers"
on public.customers for delete
to authenticated
using ((select private.is_admin_or_manager(auth.uid())));

drop policy if exists "All authenticated users can view products"
  on public.products;
drop policy if exists "All authenticated users can insert products"
  on public.products;

drop policy if exists "Admins and managers can view products"
  on public.products;
drop policy if exists "Admins and managers can insert products"
  on public.products;
drop policy if exists "Admins and managers can update products"
  on public.products;
drop policy if exists "Admins and managers can delete products"
  on public.products;

create policy "Admins and managers can view products"
on public.products for select
to authenticated
using ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can insert products"
on public.products for insert
to authenticated
with check ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can update products"
on public.products for update
to authenticated
using ((select private.is_admin_or_manager(auth.uid())))
with check ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can delete products"
on public.products for delete
to authenticated
using ((select private.is_admin_or_manager(auth.uid())));

drop policy if exists "All authenticated users can view trucks"
  on public.trucks;
drop policy if exists "All authenticated users can insert trucks"
  on public.trucks;
drop policy if exists "Owners or admins can update trucks"
  on public.trucks;
drop policy if exists "Owners or admins can delete trucks"
  on public.trucks;

drop policy if exists "Admins and managers can view trucks"
  on public.trucks;
drop policy if exists "Admins and managers can insert trucks"
  on public.trucks;
drop policy if exists "Admins and managers can update trucks"
  on public.trucks;
drop policy if exists "Admins and managers can delete trucks"
  on public.trucks;

create policy "Admins and managers can view trucks"
on public.trucks for select
to authenticated
using ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can insert trucks"
on public.trucks for insert
to authenticated
with check ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can update trucks"
on public.trucks for update
to authenticated
using ((select private.is_admin_or_manager(auth.uid())))
with check ((select private.is_admin_or_manager(auth.uid())));

create policy "Admins and managers can delete trucks"
on public.trucks for delete
to authenticated
using ((select private.is_admin_or_manager(auth.uid())));
