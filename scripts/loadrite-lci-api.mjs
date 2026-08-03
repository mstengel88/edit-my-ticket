import http from "node:http";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const DEFAULT_GATEWAY_URL = "http://192.168.41.140";

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

function normalizeGatewayBaseUrl(value) {
  const raw = String(value || env("LCI_GATEWAY_URL", DEFAULT_GATEWAY_URL)).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  const url = new URL(withProtocol);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    const error = new Error("Gateway URL must start with http:// or https://.");
    error.status = 400;
    throw error;
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function getRequestGatewayUrl(req) {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  return requestUrl.searchParams.get("gatewayUrl");
}

function gatewayUrl(path = "", overrideGatewayUrl = "") {
  const base = normalizeGatewayBaseUrl(overrideGatewayUrl);
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

async function login(overrideGatewayUrl = "") {
  const response = await fetch(gatewayUrl("/login", overrideGatewayUrl), {
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

async function dispatchTruck(token, payload, overrideGatewayUrl = "") {
  const response = await fetch(gatewayUrl("/api/trucks", overrideGatewayUrl), {
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

async function fetchGatewayJson(token, path, overrideGatewayUrl = "") {
  const response = await fetch(gatewayUrl(path, overrideGatewayUrl), {
    headers: {
      Cookie: `Token=${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function collectLookupValues(value, keys) {
  const results = new Set();
  const keySet = new Set(keys.map((key) => key.toLowerCase()));

  const visit = (node) => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (typeof child === "string" && keySet.has(key.toLowerCase()) && child.trim()) {
        results.add(child.trim());
      } else {
        visit(child);
      }
    }
  };

  visit(value);
  return [...results].sort((a, b) => a.localeCompare(b));
}

async function loadGatewayLookups(overrideGatewayUrl = "") {
  const token = await login(overrideGatewayUrl);
  const lookupSources = {
    trucks: ["/api/trucks"],
    products: ["/api/products", "/api/product", "/api/materials"],
  };
  const payloads = { trucks: [], products: [] };
  const warnings = [];

  for (const [kind, paths] of Object.entries(lookupSources)) {
    for (const path of paths) {
      try {
        const payload = await fetchGatewayJson(token, path, overrideGatewayUrl);
        const values = kind === "trucks"
          ? collectLookupValues(payload, ["Rego", "Truck", "TruckID", "Name"])
          : collectLookupValues(payload, ["Product", "Name", "Description", "Material"]);

        if (values.length > 0) {
          payloads[kind] = values;
          break;
        }
      } catch (error) {
        warnings.push(`${path}: ${error?.message || "failed"}`);
      }
    }
  }

  return { ...payloads, warnings };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      jsonResponse(res, 200, { ok: true });
      return;
    }

    const requestUrl = new URL(req.url || "/", "http://localhost");

    if (req.method === "GET" && requestUrl.pathname === "/api/lci-lookups") {
      await validateSupabaseUser(req);
      const lookups = await loadGatewayLookups(getRequestGatewayUrl(req));
      jsonResponse(res, 200, { ok: true, ...lookups });
      return;
    }

    if (req.method !== "POST" || requestUrl.pathname !== "/api/lci-dispatch") {
      jsonResponse(res, 404, { error: "Not found" });
      return;
    }

    await validateSupabaseUser(req);
    const body = await readJson(req);
    const payload = buildTruckPayload(body);
    const token = await login(body.gatewayUrl);
    const result = await dispatchTruck(token, payload, body.gatewayUrl);
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
