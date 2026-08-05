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
- The optional Cloudflare connector is a separate container and tunnel token.

## Start

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghos.yml \
  up -d --build
```

## Dedicated Cloudflare tunnel

Create a new named tunnel and point its public hostname to:

```text
http://ticket-creator:80
```

Save that tunnel's token as `TICKET_CREATOR_TUNNEL_TOKEN` in the protected
server `.env`. Do not reuse the current production Ticket Creator or
WinterWatch tunnel token.

Start the dedicated connector only after local/Tailscale verification:

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghos.yml \
  -f docker-compose.cloudflare.yml \
  --profile tunnel \
  up -d ticket-creator-cloudflared
```

The connector is named `ghos-ticket-creator-cloudflared`; it does not modify or
restart any other Cloudflare connector.

## Stop or roll back

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ghos.yml \
  down
```

Removing this parallel stack does not affect the existing Ticket Creator
deployment or its Supabase data.
