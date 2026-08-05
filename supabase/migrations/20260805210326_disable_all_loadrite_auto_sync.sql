do $$
declare
  loadrite_job record;
begin
  for loadrite_job in
    select jobid, jobname
    from cron.job
    where jobname ilike '%loadrite%'
       or command ilike '%loadrite-sync%'
       or command ilike '%functions/v1/loadrite%'
  loop
    perform cron.unschedule(loadrite_job.jobid);
  end loop;
end
$$;
