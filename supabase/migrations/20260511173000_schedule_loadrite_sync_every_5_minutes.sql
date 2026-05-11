create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'loadrite-sync-every-5-minutes'
  ) then
    perform cron.unschedule('loadrite-sync-every-5-minutes');
  end if;
end
$$;

select cron.schedule(
  'loadrite-sync-every-5-minutes',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url := 'https://dlayrpnmfnbjlxgnkczv.supabase.co/functions/v1/loadrite-sync',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
