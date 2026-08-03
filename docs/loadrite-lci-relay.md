# Loadrite LCI Onsite Relay

## What we found

The onsite gateway at `192.168.47.140` exposes a local Loadrite LCI web app over HTTP.

- Home: `http://192.168.47.140/`
- Ticket screen script: `http://192.168.47.140/js/loadout.js`
- Ticket websocket: `ws://192.168.47.140/websocket/jobs`

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

## Additional gateway findings

The local LCI also has a login flow:

- page: `http://192.168.47.140/login`
- login POST: `POST /login`
- payload:

```json
{
  "Username": "your-user",
  "Password": "your-password",
  "RememberMe": true
}
```

The authenticated truck/order side of the app appears to use richer raw time values like:

- `TimeRequested`
- `TimeStarted`
- `TimeLoaded`
- `TimeChecked`

Those are handled in JavaScript as .NET-style timestamps such as:

```text
/Date(1785507243000)/
```

So the gateway likely does have access to better timestamps than the public completed-jobs websocket exposes.

## Relay script

Use:

```sh
npm run lci:relay -- --dry-run --once
```

That connects to the onsite gateway, receives the current ticket feed, normalizes it, and prints the rows without posting anything.

To run it live against Supabase:

```sh
LCI_GATEWAY_URL=http://192.168.47.140 \
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
  -e LCI_GATEWAY_URL=http://192.168.47.140 \
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

The relay now prefers the `loadrite_activation.gatewayUrl` value saved from Ticket Creator's Loadrite Setup page. `LCI_GATEWAY_URL` is still useful as a Docker fallback/default, but changing the Loadrite Setup gateway URL in Ticket Creator will be picked up by the relay on the next refresh cycle and the relay will reconnect to the new gateway.

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

At the moment, the public websocket only exposes a display label such as:

- `8:58 AM`
- `30 Jul 26`

That is good enough for ticket sync, but not ideal if exact machine timestamps are important.

## Best next step for richer timestamps

If you want exact completion times, the next step is to authenticate to the LCI and inspect the protected endpoints or model feeds that back the truck/order screen.

That likely means:

1. log in with a valid local LCI username/password
2. inspect the authenticated `/api/trucks` and related endpoints
3. determine whether those objects can be linked back to `Ticket ID`
4. enrich the relay with the raw loaded/checked timestamp when available

## Recommendation

The best production shape for this is:

- keep this relay onsite near the gateway
- run it as a dedicated Docker container with `restart unless-stopped`
- let it push outward to Supabase over the internet
- keep your app reading from Supabase instead of talking directly to the local gateway

That way your cloud app stays simple, and only the onsite relay needs local network access to `192.168.47.140`. If the gateway IP changes, update Loadrite Setup in Ticket Creator and the relay will reconnect on its next refresh.

## Sending orders to the loader/scales

The authenticated LCI web app exposes a truck/order endpoint:

```http
POST /api/trucks
Cookie: Token=<login token>
Content-Type: application/json
```

The gateway's own UI sends this shape:

```json
{
  "Rego": "GREENHILLS-316",
  "QuantityRequested": 4,
  "Product": "#3 Landscape Stone",
  "Location": "",
  "Zone": "Ticket Creator",
  "Priority": 0
}
```

Confirmed behavior:

- `QuantityRequested` is the target quantity sent to the order queue.
- `Product` is sent as the material/product name.
- `Rego` is the truck field.
- `Zone`, `Location`, and `Priority` are supported by the gateway's truck screen.

PO numbers are not exposed in the LCI truck-order form. The dispatch helper can include experimental PO aliases (`PONumber`, `POJobNumber`, `JobNumber`) so we can test whether the backend accepts a hidden property, but that has not been confirmed yet.

Dry-run a dispatch payload:

```sh
LCI_GATEWAY_URL=http://192.168.47.140 \
LCI_USERNAME=sa \
LCI_PASSWORD=your-password \
LCI_DISPATCH_TRUCK=GREENHILLS-316 \
LCI_DISPATCH_PRODUCT="#3 Landscape Stone" \
LCI_DISPATCH_QUANTITY=4 \
LCI_DISPATCH_PO=201-10378 \
npm run lci:dispatch
```

Actually create the LCI truck order:

```sh
npm run lci:dispatch -- --submit
```
