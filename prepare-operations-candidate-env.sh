#!/usr/bin/env bash
set -euo pipefail

candidate_dir="${1:-$(pwd)}"
operations_env="${OPERATIONS_ENV_FILE:-/opt/ghos/ops/supabase-operations/.env}"
ghos_env="${GHOS_ENV_FILE:-/opt/ghos/.env}"
live_env="${LIVE_TICKET_ENV_FILE:-${candidate_dir}/.env}"
output_file="${candidate_dir}/.env.operations-candidate"

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
google_maps_key="$(read_env_value "$ghos_env" GOOGLE_MAPS_API_KEY)"
if [[ -z "$google_maps_key" ]]; then
  google_maps_key="$(read_env_value "$ghos_env" VITE_GOOGLE_MAPS_API_KEY)"
fi
if [[ -z "$google_maps_key" ]]; then
  google_maps_key="$(read_env_value "$live_env" VITE_GOOGLE_MAPS_API_KEY)"
fi

apple_client_id="$(read_env_value "$live_env" VITE_APPLE_CLIENT_ID)"
apple_redirect_uri="$(read_env_value "$live_env" VITE_APPLE_REDIRECT_URI)"

require_value ANON_KEY "$operations_anon_key"
require_value VITE_GOOGLE_MAPS_API_KEY "$google_maps_key"

umask 077
{
  printf '%s\n' 'OPERATIONS_CANDIDATE_PUBLIC_URL=http://100.75.152.30:18084'
  printf '%s\n' 'OPERATIONS_CANDIDATE_BIND_IP=100.75.152.30'
  printf '%s\n' 'OPERATIONS_CANDIDATE_PORT=18084'
  printf 'OPERATIONS_ANON_KEY=%s\n' "$operations_anon_key"
  printf 'VITE_GOOGLE_MAPS_API_KEY=%s\n' "$google_maps_key"
  printf 'VITE_APPLE_CLIENT_ID=%s\n' "$apple_client_id"
  printf 'VITE_APPLE_REDIRECT_URI=%s\n' "$apple_redirect_uri"
} > "$output_file"

chmod 600 "$output_file"
printf 'Candidate environment written to %s with mode 600.\n' "$output_file"
