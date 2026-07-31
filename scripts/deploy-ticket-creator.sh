#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

# Remove containers created before this app was managed by Docker Compose.
for name in ticket-creator lci-dispatch-api; do
  if docker ps -a --format '{{.Names}}' | grep -Fxq "$name"; then
    echo "Removing legacy container: $name"
    docker rm -f "$name"
  fi
done

docker compose down --remove-orphans
docker compose up -d --build --remove-orphans
