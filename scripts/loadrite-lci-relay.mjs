const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const once = args.has("--once");
const DEFAULT_GATEWAY_URL = "http://192.168.41.140";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
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
  if (!match) {
    return { amount: "0.00", unit: "Ton" };
  }

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

function parseDayMonthYear(label) {
  const match = label.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (!match) return null;

  const months = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const day = Number.parseInt(match[1], 10);
  const month = months[match[2].toLowerCase()];
  const year = 2000 + Number.parseInt(match[3], 10);

  if (month === undefined) return null;

  return new Date(year, month, day, 12, 0, 0, 0);
}

function normalizeCompletionLabel(label) {
  const raw = String(label ?? "").trim();
  if (!raw) return formatTicketDate(new Date());

  const timeOnly = parseTimeOnly(raw);
  if (timeOnly) return formatTicketDate(timeOnly);

  const dayMonthYear = parseDayMonthYear(raw);
  if (dayMonthYear) return formatTicketDate(dayMonthYear);

  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) {
    return formatTicketDate(native);
  }

  return formatTicketDate(new Date());
}

function normalizeTruck(value) {
  const truck = String(value ?? "").trim();
  if (!truck || truck === "NOT SPECIFIED") return "-";
  return truck;
}

function normalizeGatewayUrl(value) {
  const raw = String(value || process.env.LCI_GATEWAY_URL?.trim() || DEFAULT_GATEWAY_URL).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  const url = new URL(withProtocol);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("LCI gateway URL must start with http:// or https://.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

async function getSavedGatewayUrl() {
  if (dryRun) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.loadrite_activation&select=value&limit=1`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load Loadrite gateway setting (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  const value = Array.isArray(rows) ? rows[0]?.value : null;
  return typeof value?.gatewayUrl === "string" && value.gatewayUrl.trim() ? value.gatewayUrl.trim() : null;
}

async function resolveGatewayConfig() {
  let savedGatewayUrl = null;
  try {
    savedGatewayUrl = await getSavedGatewayUrl();
  } catch (error) {
    log("Could not read saved gateway setting; using Docker/default gateway.", error?.message || "");
  }

  const gatewayUrl = normalizeGatewayUrl(savedGatewayUrl);
  const websocketProtocol = gatewayUrl.protocol === "https:" ? "wss:" : "ws:";
  const websocketUrl = `${websocketProtocol}//${gatewayUrl.host}/websocket/jobs`;
  return { gatewayUrl, websocketUrl };
}

function jobToTicketRow(job, userId) {
  const meta = toMetadataMap(job["Meta Data"]);
  const { amount, unit } = parseWeight(job["Total Weight"]);
  const completionLabel = String(job["Completion Time"] ?? "").trim();
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
    date_time: normalizeCompletionLabel(completionLabel),
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

const syncUserId = dryRun ? "dry-run-user" : requireEnv("LOADRITE_SYNC_USER_ID");
const supabaseUrl = dryRun ? "" : requireEnv("SUPABASE_URL").replace(/\/$/, "");
const supabaseServiceRoleKey = dryRun ? "" : requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const INITIAL_SEARCH_FILTER = process.env.LCI_INITIAL_SEARCH_FILTER ?? "";
const ONCE_WAIT_MS = Number.parseInt(process.env.LCI_ONCE_WAIT_MS ?? "10000", 10);
const REFRESH_INTERVAL_MS = Number.parseInt(process.env.LCI_REFRESH_INTERVAL_MS ?? "60000", 10);

let currentWebsocketUrl = "";
let lastPayloadSignature = "";
let processedNonEmptyPayload = false;

async function loadWebSocketClient() {
  if (typeof WebSocket === "function") {
    return { WebSocketClient: WebSocket, mode: "global", eventStyle: "dom" };
  }

  try {
    const wsModule = await import("ws");
    const WebSocketClient = wsModule.WebSocket ?? wsModule.default;
    if (typeof WebSocketClient === "function") {
      return { WebSocketClient, mode: "ws-package", eventStyle: "node" };
    }
  } catch (error) {
    console.error("[loadrite-lci-relay] Failed to load ws package fallback:", error);
  }

  throw new Error("This Node runtime does not expose a WebSocket client.");
}

function log(message, detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  console.log(`[loadrite-lci-relay] ${message}${suffix}`);
}

function requestCompletedJobs(ws, eventStyle, filter = INITIAL_SEARCH_FILTER) {
  const payload = JSON.stringify({
    Name: "JobsPresenter.SearchByTicketID",
    Value: filter,
  });

  if (eventStyle === "dom") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
    return;
  }

  if (typeof ws.readyState === "number" && ws.readyState === 1) {
    ws.send(payload);
  }
}

async function handleJobsPayload(payloadValue) {
  const parsed = JSON.parse(payloadValue);
  const jobs = Array.isArray(parsed?.Jobs) ? parsed.Jobs : [];
  const rows = jobs
    .map((job) => jobToTicketRow(job, syncUserId))
    .filter((row) => row.id);

  if (rows.length > 0) {
    processedNonEmptyPayload = true;
  }

  const signature = JSON.stringify(rows.map((row) => [row.id, row.job_name, row.total_amount, row.date_time]));
  if (signature === lastPayloadSignature) {
    log("No ticket changes detected.");
    if (once && processedNonEmptyPayload) process.exit(0);
    return;
  }
  lastPayloadSignature = signature;

  if (rows.length === 0) {
    log("Gateway returned no completed jobs for the current filter.");
    if (once && processedNonEmptyPayload) process.exit(0);
    return;
  }

  if (dryRun) {
    log("Dry run normalized tickets:");
    console.log(JSON.stringify(rows, null, 2));
    if (once) process.exit(0);
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/tickets?on_conflict=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase upsert failed (${response.status}): ${errorText}`);
  }

  log(`Upserted ${rows.length} tickets from ${currentWebsocketUrl}`);
  if (once) process.exit(0);
}

async function start() {
  const { WebSocketClient, mode, eventStyle } = await loadWebSocketClient();
  const { websocketUrl } = await resolveGatewayConfig();
  currentWebsocketUrl = websocketUrl;
  log("Connecting to gateway", `${websocketUrl} via ${mode}`);
  const ws = new WebSocketClient(websocketUrl);
  let onceTimeout;
  let refreshInterval;

  const onOpen = () => {
    log("WebSocket connected.");
    requestCompletedJobs(ws, eventStyle);
    log("Requested completed jobs", `(filter: ${INITIAL_SEARCH_FILTER || "all"})`);
    if (!once && REFRESH_INTERVAL_MS > 0) {
      refreshInterval = setInterval(() => {
        void (async () => {
          const nextConfig = await resolveGatewayConfig();
          if (nextConfig.websocketUrl !== websocketUrl) {
            log("Gateway setting changed. Reconnecting to", nextConfig.websocketUrl);
            ws.close();
            return;
          }

          requestCompletedJobs(ws, eventStyle);
        })();
        log("Refreshed completed jobs request", `(filter: ${INITIAL_SEARCH_FILTER || "all"})`);
      }, REFRESH_INTERVAL_MS);
    }
    if (once) {
      onceTimeout = setTimeout(() => {
        console.error(`[loadrite-lci-relay] Timed out waiting ${ONCE_WAIT_MS}ms for completed jobs.`);
        process.exit(processedNonEmptyPayload ? 0 : 1);
      }, ONCE_WAIT_MS);
    }
  };

  const onMessage = async (payload) => {
    try {
      const data = eventStyle === "dom" ? payload.data : payload;
      const raw = typeof data === "string" ? data : data.toString();
      const message = JSON.parse(raw);
      if (message?.Name !== "JobsPresenter.FilteredJobs" || typeof message?.Value !== "string") {
        return;
      }
      await handleJobsPayload(message.Value);
    } catch (error) {
      console.error("[loadrite-lci-relay] Failed to process websocket message:", error);
      if (once) process.exit(1);
    }
  };

  const onClose = () => {
    if (onceTimeout) {
      clearTimeout(onceTimeout);
      onceTimeout = undefined;
    }
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = undefined;
    }
    log("WebSocket disconnected. Reconnecting in 5 seconds.");
    setTimeout(() => {
      void start();
    }, 5000);
  };

  const onError = (error) => {
    console.error("[loadrite-lci-relay] WebSocket error:", error);
  };

  if (eventStyle === "dom") {
    ws.addEventListener("open", onOpen);
    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose);
    ws.addEventListener("error", onError);
    return;
  }

  ws.on("open", onOpen);
  ws.on("message", onMessage);
  ws.on("close", onClose);
  ws.on("error", onError);
}

void start();
