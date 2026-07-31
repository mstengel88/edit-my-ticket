import http from "node:http";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);

function env(name, fallback = "") {
  return process.env[name]?.trim() ?? fallback;
}

function requireEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20_000) {
      throw new Error("Request body is too large.");
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function gatewayUrl(path = "") {
  const base = new URL(env("LCI_GATEWAY_URL", "http://192.168.36.140"));
  return new URL(path, base).toString();
}

async function validateSupabaseUser(req) {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const supabaseKey = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_ANON_KEY");
  if (!supabaseKey) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY is required.");
  }

  const authorization = req.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) {
    const error = new Error("Missing authorization token.");
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = new Error("Invalid or expired authorization token.");
    error.status = 401;
    throw error;
  }

  return response.json();
}

function buildTruckPayload(body) {
  const quantity = Number.parseFloat(String(body.quantity ?? body.QuantityRequested ?? ""));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    const error = new Error("Quantity must be a positive number.");
    error.status = 400;
    throw error;
  }

  const truck = String(body.truck ?? body.Rego ?? "").trim();
  const product = String(body.product ?? body.Product ?? "").trim();

  if (!truck) {
    const error = new Error("Truck is required.");
    error.status = 400;
    throw error;
  }

  if (!product) {
    const error = new Error("Product is required.");
    error.status = 400;
    throw error;
  }

  const po = String(body.poNumber ?? body.po ?? "").trim();
  const payload = {
    Rego: truck,
    QuantityRequested: quantity,
    Product: product,
    Location: String(body.location ?? "").trim() || undefined,
    Zone: String(body.zone ?? "Ticket Creator").trim() || "Ticket Creator",
    Priority: Number.parseInt(String(body.priority ?? "0"), 10) || 0,
  };

  if (po) {
    // The LCI UI does not expose a PO field, but these aliases let us use any
    // hidden backend property the gateway may accept.
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

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      jsonResponse(res, 200, { ok: true });
      return;
    }

    if (req.method !== "POST" || req.url !== "/api/lci-dispatch") {
      jsonResponse(res, 404, { error: "Not found" });
      return;
    }

    await validateSupabaseUser(req);
    const body = await readJson(req);
    const payload = buildTruckPayload(body);
    const token = await login();
    const result = await dispatchTruck(token, payload);
    jsonResponse(res, 200, { ok: true, payload, result });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    console.error("[loadrite-lci-api]", error);
    jsonResponse(res, status, { ok: false, error: error?.message || "Gateway dispatch failed" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[loadrite-lci-api] listening on ${PORT}`);
});
