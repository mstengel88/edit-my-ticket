const args = new Set(process.argv.slice(2));
const submit = args.has("--submit");

function env(name, fallback = "") {
  return process.env[name]?.trim() ?? fallback;
}

function requireEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function gatewayUrl(path = "") {
  const base = new URL(env("LCI_GATEWAY_URL", "http://192.168.47.140"));
  return new URL(path, base).toString();
}

function buildTruckPayload() {
  const quantity = Number.parseFloat(requireEnv("LCI_DISPATCH_QUANTITY"));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("LCI_DISPATCH_QUANTITY must be a positive number.");
  }

  const po = env("LCI_DISPATCH_PO");
  const payload = {
    Rego: requireEnv("LCI_DISPATCH_TRUCK"),
    QuantityRequested: quantity,
    Product: requireEnv("LCI_DISPATCH_PRODUCT"),
    Location: env("LCI_DISPATCH_LOCATION") || undefined,
    Zone: env("LCI_DISPATCH_ZONE", "Ticket Creator"),
    Priority: Number.parseInt(env("LCI_DISPATCH_PRIORITY", "0"), 10),
  };

  if (po) {
    // The LCI web UI does not expose a PO field. These aliases are experimental
    // and let us test whether the backend accepts a hidden PO property.
    payload.PONumber = po;
    payload.POJobNumber = po;
    payload.JobNumber = po;
  }

  return payload;
}

async function login() {
  const response = await fetch(gatewayUrl("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Username: requireEnv("LCI_USERNAME"),
      Password: requireEnv("LCI_PASSWORD"),
      RememberMe: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`LCI login failed (${response.status}): ${await response.text()}`);
  }

  const setCookie = response.headers.get("set-cookie") ?? "";
  const token = setCookie.match(/Token=([^;]+)/)?.[1];
  if (!token) {
    throw new Error("LCI login did not return a Token cookie.");
  }

  return token;
}

async function dispatchTruck(token, payload) {
  const response = await fetch(gatewayUrl("/api/trucks"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `Token=${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LCI truck dispatch failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

async function main() {
  const payload = buildTruckPayload();
  console.log("[loadrite-lci-dispatch] Payload:");
  console.log(JSON.stringify(payload, null, 2));

  if (!submit) {
    console.log("[loadrite-lci-dispatch] Dry run only. Add --submit to create the LCI truck order.");
    return;
  }

  const token = await login();
  const result = await dispatchTruck(token, payload);
  console.log("[loadrite-lci-dispatch] Created LCI truck order:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[loadrite-lci-dispatch]", error);
  process.exit(1);
});
