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
