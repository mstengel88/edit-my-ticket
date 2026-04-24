ALTER TABLE public.trucks
ADD COLUMN IF NOT EXISTS normalized_name text;

UPDATE public.trucks
SET
  name = regexp_replace(btrim(name), '\s+', ' ', 'g'),
  normalized_name = lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
WHERE normalized_name IS NULL
   OR normalized_name <> lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
   OR name <> regexp_replace(btrim(name), '\s+', ' ', 'g');

DELETE FROM public.trucks t
USING (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY normalized_name
        ORDER BY created_at ASC, id ASC
      ) AS row_num
    FROM public.trucks
  ) ranked
  WHERE row_num > 1
) duplicates
WHERE t.id = duplicates.id;

ALTER TABLE public.trucks
ALTER COLUMN normalized_name SET NOT NULL;

ALTER TABLE public.trucks
DROP CONSTRAINT IF EXISTS trucks_name_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS trucks_normalized_name_key
ON public.trucks (normalized_name);

CREATE OR REPLACE FUNCTION public.set_truck_normalized_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := regexp_replace(btrim(NEW.name), '\s+', ' ', 'g');
  NEW.normalized_name := lower(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trucks_set_normalized_name ON public.trucks;

CREATE TRIGGER trucks_set_normalized_name
BEFORE INSERT OR UPDATE ON public.trucks
FOR EACH ROW
EXECUTE FUNCTION public.set_truck_normalized_name();
