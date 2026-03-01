UPDATE public.tickets
SET job_number = 'MT-' || substring(job_number FROM 4)
WHERE job_number LIKE 'TM-%';