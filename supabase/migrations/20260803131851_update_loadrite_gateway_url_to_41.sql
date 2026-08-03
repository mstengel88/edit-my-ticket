update public.system_settings
set value = jsonb_set(
    value,
    '{gatewayUrl}',
    to_jsonb('http://192.168.41.140'::text),
    true
  ),
  updated_at = now()
where key = 'loadrite_activation'
  and (
    value->>'gatewayUrl' is null
    or value->>'gatewayUrl' = ''
    or value->>'gatewayUrl' = 'http://192.168.36.140'
    or value->>'gatewayUrl' = '192.168.36.140'
  );
