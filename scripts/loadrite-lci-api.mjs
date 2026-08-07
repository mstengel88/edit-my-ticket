import http from "node:http";
import WebSocket from "ws";
import { filterSyncableTicketRows, preserveExistingTicketStatuses } from "./loadrite-sync-policy.mjs";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const DEFAULT_GATEWAY_URL = "http://192.168.47.140";

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

  const payload = await response.json();
  return payload?.user ?? payload;
}

function formatTicketDate(date) {
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toMetadataMap(entries) {
  return Object.fromEntries(
    (Array.isArray(entries) ? entries : [])
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => [String(entry.Label ?? "").trim(), String(entry.Value ?? "").trim()]),
  );
}

function parseWeight(weightText) {
  const value = String(weightText ?? "").trim();
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z]+)/);
  if (!match) return { amount: "0.00", unit: "Ton" };

  const amount = Number.parseFloat(match[1]);
  const unitToken = match[2].toLowerCase();
  let unit = "Ton";
  if (unitToken.startsWith("y")) unit = "Yardage";
  if (unitToken.startsWith("g")) unit = "Gallons";

  return {
    amount: Number.isFinite(amount) ? amount.toFixed(2) : "0.00",
    unit,
  };
}

function parseTimeOnly(label, now = new Date()) {
  const match = label.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const parsed = new Date(now);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

function isDayMonthYearOnly(label) {
  return /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/.test(label);
}

function hasExplicitTime(label) {
  return /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?\b/i.test(label) || /T\d{2}:\d{2}/.test(label);
}

function normalizeCompletionLabel(label) {
  const raw = String(label ?? "").trim();
  if (!raw) return null;

  const timeOnly = parseTimeOnly(raw);
  if (timeOnly) return formatTicketDate(timeOnly);

  if (isDayMonthYearOnly(raw) || !hasExplicitTime(raw)) return null;

  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) return formatTicketDate(native);

  return null;
}

function normalizeTruck(value) {
  const truck = String(value ?? "").trim();
  if (!truck || truck === "NOT SPECIFIED") return "-";
  return truck;
}

function jobToTicketRow(job, userId) {
  const meta = toMetadataMap(job["Meta Data"]);
  const { amount, unit } = parseWeight(job["Total Weight"]);
  const completionLabel = String(job["Completion Time"] ?? "").trim();
  const dateTime = normalizeCompletionLabel(completionLabel);
  if (!dateTime) return null;

  const poNumber =
    meta["PO-Job Number"] ??
    meta["PO / Job Number"] ??
    meta["PO Number"] ??
    meta["PO"] ??
    "";

  return {
    id: String(job["Ticket ID"] ?? "").trim(),
    source: "loadrite",
    user_id: userId,
    job_number: String(job["Ticket ID"] ?? "").trim(),
    job_name: poNumber,
    date_time: dateTime,
    total_amount: amount,
    total_unit: unit,
    customer: meta.Customer ?? "",
    product: meta.Product ?? "",
    truck: normalizeTruck(meta.Truck),
    note: completionLabel ? `LCI completion label: ${completionLabel}` : "",
    bucket: "Imported from onsite Loadrite LCI",
    status: "pending",
  };
}

function requestCompletedJobs(ws, filter = "") {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ Name: "JobsPresenter.SearchByTicketID", Value: filter }));
  }
}

async function fetchCompletedJobs(overrideGatewayUrl = "") {
  const gateway = normalizeGatewayBaseUrl(overrideGatewayUrl);
  const websocketProtocol = gateway.protocol === "https:" ? "wss:" : "ws:";
  const websocketUrl = `${websocketProtocol}//${gateway.host}/websocket/jobs`;
  const waitMs = Number.parseInt(env("LCI_ONCE_WAIT_MS", "10000"), 10);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(websocketUrl);
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch {}
      reject(new Error(`Timed out waiting ${waitMs}ms for completed jobs.`));
    }, waitMs);

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      callback(value);
    };

    ws.on("open", () => {
      requestCompletedJobs(ws, env("LCI_INITIAL_SEARCH_FILTER", ""));
    });

    ws.on("message", (data) => {
      try {
        const raw = typeof data === "string" ? data : data.toString();
        const message = JSON.parse(raw);
        if (message?.Name !== "JobsPresenter.FilteredJobs" || typeof message?.Value !== "string") return;
        const parsed = JSON.parse(message.Value);
        const jobs = Array.isArray(parsed?.Jobs) ? parsed.Jobs : [];
        finish(resolve, { jobs, websocketUrl });
      } catch (error) {
        finish(reject, error);
      }
    });

    ws.on("error", (error) => {
      finish(reject, new Error(`Could not connect to LCI websocket at ${websocketUrl}: ${error?.message || "unknown error"}`));
    });
  });
}

async function syncCompletedTickets(userId, overrideGatewayUrl = "") {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const syncUserId = env("LOADRITE_SYNC_USER_ID") || userId;
  if (!syncUserId) {
    const error = new Error("LOADRITE_SYNC_USER_ID is required when the authenticated user cannot be determined.");
    error.status = 500;
    throw error;
  }

  const { jobs, websocketUrl } = await fetchCompletedJobs(overrideGatewayUrl);
  const incomingRows = jobs.map((job) => jobToTicketRow(job, syncUserId)).filter((row) => row?.id);
  const skippedAmbiguousTime = jobs.length - incomingRows.length;

  if (incomingRows.length === 0) {
    return { imported: 0, skippedAmbiguousTime, skippedFinalized: 0, tickets: [], websocketUrl };
  }

  const existingResponse = await fetch(
    `${supabaseUrl}/rest/v1/tickets?select=id,status`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!existingResponse.ok) {
    throw new Error(
      `Supabase ticket status lookup failed (${existingResponse.status}): ${await existingResponse.text()}`,
    );
  }

  const existingRows = await existingResponse.json();
  const syncableRows = filterSyncableTicketRows(incomingRows, existingRows);
  const rows = preserveExistingTicketStatuses(syncableRows, existingRows);
  const skippedFinalized = incomingRows.length - rows.length;

  if (rows.length === 0) {
    return { imported: 0, skippedAmbiguousTime, skippedFinalized, tickets: [], websocketUrl };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/tickets?on_conflict=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Supabase upsert failed (${response.status}): ${await response.text()}`);
  }

  return {
    imported: rows.length,
    skippedAmbiguousTime,
    skippedFinalized,
    tickets: rows.map((row) => row.id),
    websocketUrl,
  };
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
  const path = "/api/trucks";
  const response = await fetch(gatewayUrl(path, overrideGatewayUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `Token=${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LCI truck dispatch POST ${path} failed (${response.status}): ${text}`);
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
    console.log(`[loadrite-lci-api] ${req.method} ${requestUrl.pathname}`);

    if (req.method === "GET" && requestUrl.pathname === "/api/lci-lookups") {
      await validateSupabaseUser(req);
      const lookups = await loadGatewayLookups(getRequestGatewayUrl(req));
      console.log(
        `[loadrite-lci-api] Loaded lookups: ${lookups.trucks.length} trucks, ${lookups.products.length} products`,
      );
      jsonResponse(res, 200, { ok: true, ...lookups });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/lci-sync") {
      const user = await validateSupabaseUser(req);
      const body = await readJson(req);
      const result = await syncCompletedTickets(user?.id, body.gatewayUrl);
      console.log(`[loadrite-lci-api] Synced ${result.imported} tickets from ${result.websocketUrl}`);
      jsonResponse(res, 200, { ok: true, ...result });
      return;
    }

    if (req.method !== "POST" || requestUrl.pathname !== "/api/lci-dispatch") {
      jsonResponse(res, 404, { error: "Not found" });
      return;
    }

    await validateSupabaseUser(req);
    const body = await readJson(req);
    const payload = buildTruckPayload(body);
    console.log(`[loadrite-lci-api] Dispatching truck to ${normalizeGatewayBaseUrl(body.gatewayUrl).origin}`, payload);
    const token = await login(body.gatewayUrl);
    const result = await dispatchTruck(token, payload, body.gatewayUrl);
    console.log("[loadrite-lci-api] Dispatch accepted by LCI gateway");
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
