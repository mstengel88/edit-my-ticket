# Loadrite LCI Onsite Relay

## What we found

The onsite gateway at `192.168.36.140` exposes a local Loadrite LCI web app over HTTP.

- Home: `http://192.168.36.140/`
- Ticket screen script: `http://192.168.36.140/js/loadout.js`
- Ticket websocket: `ws://192.168.36.140/websocket/jobs`

The ticket websocket publishes completed job data in this shape:

- `Ticket ID`
- `Total Weight`
- `Completion Time`
- `Meta Data`
  - `Product`
  - `Customer`
  - `Truck`
  - `PO-Job Number`

That means we do not need to sniff packets to get the ticket feed. We can subscribe directly to the gateway's websocket and relay normalized ticket rows into Supabase.

## Relay script

Use:

```sh
npm run lci:relay -- --dry-run --once
```

That connects to the onsite gateway, receives the current ticket feed, normalizes it, and prints the rows without posting anything.

To run it live against Supabase:

```sh
LCI_GATEWAY_URL=http://192.168.36.140 \
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
LOADRITE_SYNC_USER_ID=YOUR_AUTH_USER_UUID \
npm run lci:relay
```

## Run it as an onsite Docker service

Build the dedicated relay image:

```sh
docker build -f Dockerfile.lci-relay -t loadrite-lci-relay .
```

Run it as a long-lived service:

```sh
docker run -d \
  --name loadrite-lci-relay \
  --restart unless-stopped \
  -e LCI_GATEWAY_URL=http://192.168.36.140 \
  -e SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
  -e LOADRITE_SYNC_USER_ID=YOUR_AUTH_USER_UUID \
  loadrite-lci-relay
```

Useful checks:

```sh
docker logs -f loadrite-lci-relay
docker restart loadrite-lci-relay
docker rm -f loadrite-lci-relay
```

That gives you a small always-on onsite collector that subscribes to the gateway and pushes ticket rows outward to Supabase.

## Mapping used

- `Ticket ID` -> `id`, `job_number`
- `PO-Job Number` -> `job_name`
- `Total Weight` -> `total_amount`, `total_unit`
- `Customer` -> `customer`
- `Product` -> `product`
- `Truck` -> `truck`
- `Completion Time` -> normalized into `date_time`
- `source` -> `loadrite`

## Important limitation

The websocket sends a display-style completion value, not a full machine timestamp.

Examples:

- `8:58 AM`
- `30 Jul 26`

The relay currently normalizes those like this:

- same-day time labels use today's date plus the given time
- date-only labels use noon on that date

If you need exact second-level load timestamps, the next step would be finding a deeper API or model endpoint on the gateway that exposes the raw completion datetime rather than the display label.

## Recommendation

The best production shape for this is:

- keep this relay onsite near the gateway
- run it as a dedicated Docker container with `restart unless-stopped`
- let it push outward to Supabase over the internet
- keep your app reading from Supabase instead of talking directly to the local gateway

That way your cloud app stays simple, and only the onsite relay needs local network access to `192.168.36.140`.
