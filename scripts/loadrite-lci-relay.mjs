const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const once = args.has("--once");

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

const gatewayUrl = new URL(process.env.LCI_GATEWAY_URL?.trim() || "http://192.168.36.140");
const websocketProtocol = gatewayUrl.protocol === "https:" ? "wss:" : "ws:";
const websocketUrl = `${websocketProtocol}//${gatewayUrl.host}/websocket/jobs`;

const syncUserId = dryRun ? "dry-run-user" : requireEnv("LOADRITE_SYNC_USER_ID");
const supabaseUrl = dryRun ? "" : requireEnv("SUPABASE_URL").replace(/\/$/, "");
const supabaseServiceRoleKey = dryRun ? "" : requireEnv("SUPABASE_SERVICE_ROLE_KEY");

let lastPayloadSignature = "";

function log(message, detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  console.log(`[loadrite-lci-relay] ${message}${suffix}`);
}

async function handleJobsPayload(payloadValue) {
  const parsed = JSON.parse(payloadValue);
  const jobs = Array.isArray(parsed?.Jobs) ? parsed.Jobs : [];
  const rows = jobs
    .map((job) => jobToTicketRow(job, syncUserId))
    .filter((row) => row.id);

  const signature = JSON.stringify(rows.map((row) => [row.id, row.job_name, row.total_amount, row.date_time]));
  if (signature === lastPayloadSignature) {
    log("No ticket changes detected.");
    if (once) process.exit(0);
    return;
  }
  lastPayloadSignature = signature;

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

  log(`Upserted ${rows.length} tickets from ${websocketUrl}`);
  if (once) process.exit(0);
}

function start() {
  if (typeof WebSocket !== "function") {
    throw new Error("This Node runtime does not expose a WebSocket client.");
  }

  log("Connecting to gateway", websocketUrl);
  const ws = new WebSocket(websocketUrl);

  ws.addEventListener("open", () => {
    log("WebSocket connected.");
  });

  ws.addEventListener("message", async (event) => {
    try {
      const message = JSON.parse(String(event.data));
      if (message?.Name !== "JobsPresenter.FilteredJobs" || typeof message?.Value !== "string") {
        return;
      }
      await handleJobsPayload(message.Value);
    } catch (error) {
      console.error("[loadrite-lci-relay] Failed to process websocket message:", error);
      if (once) process.exit(1);
    }
  });

  ws.addEventListener("close", () => {
    log("WebSocket disconnected. Reconnecting in 5 seconds.");
    setTimeout(start, 5000);
  });

  ws.addEventListener("error", (error) => {
    console.error("[loadrite-lci-relay] WebSocket error:", error);
  });
}

start();
