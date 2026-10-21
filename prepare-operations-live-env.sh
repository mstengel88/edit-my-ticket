#!/usr/bin/env bash
set -euo pipefail

app_dir="${1:-$(pwd)}"
operations_env="${OPERATIONS_ENV_FILE:-/opt/ghos/ops/supabase-operations/.env}"
ghos_env="${GHOS_ENV_FILE:-/opt/ghos/.env}"
legacy_env="${LEGACY_TICKET_ENV_FILE:-${app_dir}/.env}"
output_file="${app_dir}/.env.operations-live"

read_env_value() {
  local file="$1"
  local name="$2"
  [[ -f "$file" ]] || return 0
  sed -n "s/^${name}=//p" "$file" | tail -n 1 | tr -d '\r'
}

require_value() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    printf 'Required value %s was not found.\n' "$name" >&2
    exit 1
  fi
}

operations_anon_key="$(read_env_value "$operations_env" ANON_KEY)"
operations_service_key="$(read_env_value "$operations_env" SERVICE_ROLE_KEY)"
google_maps_key="$(read_env_value "$ghos_env" GOOGLE_MAPS_API_KEY)"
[[ -n "$google_maps_key" ]] || google_maps_key="$(read_env_value "$ghos_env" VITE_GOOGLE_MAPS_API_KEY)"
[[ -n "$google_maps_key" ]] || google_maps_key="$(read_env_value "$legacy_env" VITE_GOOGLE_MAPS_API_KEY)"

lci_gateway_url="$(read_env_value "$legacy_env" LCI_GATEWAY_URL)"
lci_username="$(read_env_value "$legacy_env" LCI_USERNAME)"
lci_password="$(read_env_value "$legacy_env" LCI_PASSWORD)"
loadrite_user_id="$(read_env_value "$legacy_env" LOADRITE_SYNC_USER_ID)"
apple_client_id="$(read_env_value "$legacy_env" VITE_APPLE_CLIENT_ID)"
apple_redirect_uri="$(read_env_value "$legacy_env" VITE_APPLE_REDIRECT_URI)"

require_value ANON_KEY "$operations_anon_key"
require_value SERVICE_ROLE_KEY "$operations_service_key"
require_value VITE_GOOGLE_MAPS_API_KEY "$google_maps_key"
require_value LCI_USERNAME "$lci_username"
require_value LCI_PASSWORD "$lci_password"
require_value LOADRITE_SYNC_USER_ID "$loadrite_user_id"

umask 077
{
  printf '%s\n' 'TICKET_CREATOR_PORT=8084'
  printf 'OPERATIONS_ANON_KEY=%s\n' "$operations_anon_key"
  printf 'OPERATIONS_SERVICE_ROLE_KEY=%s\n' "$operations_service_key"
  printf 'VITE_GOOGLE_MAPS_API_KEY=%s\n' "$google_maps_key"
  printf 'VITE_APPLE_CLIENT_ID=%s\n' "$apple_client_id"
  printf 'VITE_APPLE_REDIRECT_URI=%s\n' "$apple_redirect_uri"
  printf 'LCI_GATEWAY_URL=%s\n' "${lci_gateway_url:-http://192.168.47.140}"
  printf 'LCI_USERNAME=%s\n' "$lci_username"
  printf 'LCI_PASSWORD=%s\n' "$lci_password"
  printf 'LOADRITE_SYNC_USER_ID=%s\n' "$loadrite_user_id"
} > "$output_file"

chmod 600 "$output_file"
printf 'Live Operations environment written to %s with mode 600.\n' "$output_file"
