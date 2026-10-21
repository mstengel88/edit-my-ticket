#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
env_file="${OPERATIONS_LIVE_ENV_FILE:-.env.operations-live}"

if [ ! -r "$env_file" ]; then
  printf 'Live environment file is missing: %s\n' "$env_file" >&2
  printf 'Run ./prepare-operations-live-env.sh first.\n' >&2
  exit 1
fi

docker compose \
  --env-file .env \
  --env-file "$env_file" \
  -f docker-compose.yml \
  -f docker-compose.operations-live.yml \
  config --quiet

# Automatic Loadrite polling is intentionally disabled. Remove a relay left
# behind by an older deployment before starting the manual-sync services.
docker rm -f ghos-ticket-creator-loadrite-relay 2>/dev/null || true

docker compose \
  --env-file .env \
  --env-file "$env_file" \
  -f docker-compose.yml \
  -f docker-compose.operations-live.yml \
  up -d --build
