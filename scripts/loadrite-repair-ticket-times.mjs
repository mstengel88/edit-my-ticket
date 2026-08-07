import { readFileSync } from "node:fs";

const LOADRITE_BASE = "https://apicloud.loadrite-myinsighthq.com/api/v2";
const DEFAULT_LOOKBACK_DAYS = 30;

loadDotenv();

const args = process.argv.slice(2);
const options = parseArgs(args);

function loadDotenv(path = ".env") {
  let contents = "";
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
}

function parseArgs(values) {
  const parsed = {
    apply: false,
    all: false,
    from: "",
    to: "",
    site: process.env.LOADRITE_SYNC_SITE || "Green Hills Landscape - Menomonee Falls",
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--apply") {
      parsed.apply = true;
      continue;
    }
    if (value === "--all") {
      parsed.all = true;
      continue;
    }
    if (value === "--from") {
      parsed.from = values[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--to") {
      parsed.to = values[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--site") {
      parsed.site = values[index + 1] || parsed.site;
      index += 1;
    }
  }

  return parsed;
}

function env(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function requireEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function dateOnly(value) {
  return value.toISOString().split("T")[0];
}

function defaultFromDate() {
  return dateOnly(new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
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

function parseTicketDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isNoonTimestamp(value) {
  const parsed = parseTicketDate(value);
  return Boolean(parsed && parsed.getHours() === 12 && parsed.getMinutes() === 0);
}

function normalizeTicketId(value) {
  return String(value ?? "").trim();
}

function normalizeTicketNumber(value, fallbackId = "") {
  const ticket = normalizeTicketId(value);
  if (ticket) return ticket;
  const fallback = normalizeTicketId(fallbackId);
  return fallback ? `LR-${fallback}` : "";
}

async function fetchLoadingRecords(token, site, fromDate, toDate) {
  const params = new URLSearchParams({
    Site: site,
    FromLocalTime: `${fromDate} 00:00:00`,
    ToLocalTime: `${toDate} 23:59:59`,
  });

  const response = await fetch(`${LOADRITE_BASE}/Loading?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404 || response.status === 204) return [];

  if (!response.ok) {
    throw new Error(`Loadrite API error (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) return payload.data;
  return [];
}

function groupRecordsIntoTicketTimes(records) {
  const ticketTimes = new Map();

  for (const record of records) {
    if (record?.Event !== "Short Total") continue;

    const ticketNumber = normalizeTicketNumber(record.Sequence, record.Id);
    const rawTime = String(record.Time ?? "").trim();
    const parsedTime = rawTime ? new Date(rawTime) : null;

    if (!ticketNumber || !parsedTime || Number.isNaN(parsedTime.getTime())) continue;

    ticketTimes.set(ticketNumber, {
      id: ticketNumber,
      loadriteTime: rawTime,
      repairedDateTime: formatTicketDate(parsedTime),
    });
  }

  return ticketTimes;
}

async function fetchSupabaseTickets(supabaseUrl, serviceRoleKey) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/tickets?select=id,job_number,date_time,status,source&source=eq.loadrite&limit=10000`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase ticket lookup failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function updateTicketTime(supabaseUrl, serviceRoleKey, id, dateTime) {
  const response = await fetch(`${supabaseUrl}/rest/v1/tickets?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ date_time: dateTime }),
  });

  if (!response.ok) {
    throw new Error(`Supabase ticket update failed for ${id} (${response.status}): ${await response.text()}`);
  }
}

function buildRepairs(tickets, loadriteTimes, updateAll) {
  return tickets.flatMap((ticket) => {
    const candidates = [
      normalizeTicketId(ticket.id),
      normalizeTicketId(ticket.job_number),
    ].filter(Boolean);

    const match = candidates.map((candidate) => loadriteTimes.get(candidate)).find(Boolean);
    if (!match) return [];
    if (!updateAll && !isNoonTimestamp(ticket.date_time)) return [];
    if (String(ticket.date_time ?? "").trim() === match.repairedDateTime) return [];

    return [{
      id: ticket.id,
      jobNumber: ticket.job_number,
      status: ticket.status,
      currentDateTime: ticket.date_time,
      repairedDateTime: match.repairedDateTime,
      loadriteTime: match.loadriteTime,
    }];
  });
}

async function main() {
  const loadriteToken = requireEnv("LOADRITE_API_TOKEN");
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY") || env("LOADRITE_SYNC_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY or LOADRITE_SYNC_SERVICE_ROLE_KEY is required.");

  const toDate = options.to || dateOnly(new Date());
  const fromDate = options.from || defaultFromDate();

  console.log(`[loadrite-repair] Fetching Loadrite Loading records for "${options.site}" from ${fromDate} to ${toDate}`);
  const records = await fetchLoadingRecords(loadriteToken, options.site, fromDate, toDate);
  const loadriteTimes = groupRecordsIntoTicketTimes(records);
  console.log(`[loadrite-repair] Found ${loadriteTimes.size} Loadrite ticket times.`);

  const tickets = await fetchSupabaseTickets(supabaseUrl, serviceRoleKey);
  const repairs = buildRepairs(tickets, loadriteTimes, options.all);

  if (repairs.length === 0) {
    console.log("[loadrite-repair] No matching Supabase ticket times need repair.");
    return;
  }

  console.table(repairs.map((repair) => ({
    id: repair.id,
    status: repair.status,
    current: repair.currentDateTime,
    repaired: repair.repairedDateTime,
  })));

  if (!options.apply) {
    console.log(`[loadrite-repair] Dry run only. Re-run with --apply to update ${repairs.length} ticket time(s).`);
    return;
  }

  for (const repair of repairs) {
    await updateTicketTime(supabaseUrl, serviceRoleKey, repair.id, repair.repairedDateTime);
  }

  console.log(`[loadrite-repair] Updated ${repairs.length} ticket time(s).`);
}

main().catch((error) => {
  console.error("[loadrite-repair]", error);
  process.exit(1);
});
