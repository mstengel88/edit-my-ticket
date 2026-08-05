# GHOS deployment

The GHOS deployment is a parallel copy of Ticket Creator. It uses the same
application source and Supabase project, but it does not replace the existing
production deployment.

## Behavior

- Port `8084` is the default local/Tailscale port.
- The standalone Ticket Creator navigation is hidden inside GHOS.
- PWA registration, install prompts, and PWA caches are disabled.
- The LCI relay remains a separate container.
- Runtime credentials stay in a root-owned `.env` file and are never committed.
- The existing Ticket Creator deployment and hostname are not modified.

## Start

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghos.yml \
  up -d --build
```

## Stop or roll back

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghos.yml \
  down
```

Removing this parallel stack does not affect the existing Ticket Creator
deployment or its Supabase data.
