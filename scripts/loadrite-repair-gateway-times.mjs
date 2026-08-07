import { readFileSync } from "node:fs";
import WebSocket from "ws";

const DEFAULT_GATEWAY_URL = "http://192.168.47.140";
const DEFAULT_WAIT_MS = 10000;

loadDotenv();

const options = parseArgs(process.argv.slice(2));

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
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

function parseArgs(values) {
  const parsed = {
    apply: false,
    all: false,
    date: "",
    gatewayUrl: process.env.LCI_GATEWAY_URL || DEFAULT_GATEWAY_URL,
    waitMs: Number.parseInt(process.env.LCI_ONCE_WAIT_MS || `${DEFAULT_WAIT_MS}`, 10),
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
    if (value === "--date") {
      parsed.date = values[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--gateway") {
      parsed.gatewayUrl = values[index + 1] || parsed.gatewayUrl;
      index += 1;
      continue;
    }
    if (value === "--wait-ms") {
      parsed.waitMs = Number.parseInt(values[index + 1] || `${parsed.waitMs}`, 10);
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

function normalizeGatewayBaseUrl(value) {
  const raw = String(value || DEFAULT_GATEWAY_URL).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Gateway URL must start with http:// or https://.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function normalizeTicketId(value) {
  return String(value ?? "").trim();
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

function parseRepairDate(dateText) {
  if (!dateText) return new Date();

  const parsed = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("--date must be formatted like YYYY-MM-DD.");
  }
  return parsed;
}

function parseTimeOnly(label, dateBase) {
  const match = String(label ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const parsed = new Date(dateBase);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

async function fetchGatewayJobs(gatewayUrl, waitMs) {
  const gateway = normalizeGatewayBaseUrl(gatewayUrl);
  const websocketProtocol = gateway.protocol === "https:" ? "wss:" : "ws:";
  const websocketUrl = `${websocketProtocol}//${gateway.host}/websocket/jobs`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(websocketUrl);
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {}
      reject(new Error(`Timed out waiting ${waitMs}ms for completed jobs.`));
    }, waitMs);

    function finish(callback, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {}
      callback(value);
    }

    ws.on("open", () => {
      ws.send(JSON.stringify({ Name: "JobsPresenter.SearchByTicketID", Value: "" }));
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message?.Name !== "JobsPresenter.FilteredJobs" || typeof message.Value !== "string") return;
        const parsed = JSON.parse(message.Value);
        finish(resolve, Array.isArray(parsed?.Jobs) ? parsed.Jobs : []);
      } catch (error) {
        finish(reject, error);
      }
    });

    ws.on("error", (error) => {
      finish(reject, new Error(`Could not connect to LCI websocket at ${websocketUrl}: ${error?.message || "unknown error"}`));
    });
  });
}

function gatewayJobsToTimes(jobs, dateBase) {
  const ticketTimes = new Map();

  for (const job of jobs) {
    const ticketId = normalizeTicketId(job?.["Ticket ID"]);
    const completionLabel = String(job?.["Completion Time"] ?? "").trim();
    const parsedTime = parseTimeOnly(completionLabel, dateBase);

    if (!ticketId || !parsedTime) continue;

    ticketTimes.set(ticketId, {
      id: ticketId,
      completionLabel,
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

function buildRepairs(tickets, gatewayTimes, updateAll) {
  return tickets.flatMap((ticket) => {
    const candidates = [
      normalizeTicketId(ticket.id),
      normalizeTicketId(ticket.job_number),
    ].filter(Boolean);

    const match = candidates.map((candidate) => gatewayTimes.get(candidate)).find(Boolean);
    if (!match) return [];
    if (!updateAll && !isNoonTimestamp(ticket.date_time)) return [];
    if (String(ticket.date_time ?? "").trim() === match.repairedDateTime) return [];

    return [{
      id: ticket.id,
      jobNumber: ticket.job_number,
      status: ticket.status,
      currentDateTime: ticket.date_time,
      completionLabel: match.completionLabel,
      repairedDateTime: match.repairedDateTime,
    }];
  });
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

async function main() {
  const supabaseUrl = (env("SUPABASE_URL") || env("VITE_SUPABASE_URL")).replace(/\/$/, "");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY") || env("LOADRITE_SYNC_SERVICE_ROLE_KEY");

  if (!supabaseUrl) throw new Error("SUPABASE_URL or VITE_SUPABASE_URL is required.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY or LOADRITE_SYNC_SERVICE_ROLE_KEY is required.");

  const repairDate = parseRepairDate(options.date);
  console.log(`[loadrite-gateway-repair] Reading completed jobs from ${normalizeGatewayBaseUrl(options.gatewayUrl).origin}`);
  const jobs = await fetchGatewayJobs(options.gatewayUrl, options.waitMs);
  const gatewayTimes = gatewayJobsToTimes(jobs, repairDate);
  const dateNote = options.date ? options.date : "today";
  console.log(`[loadrite-gateway-repair] Found ${jobs.length} gateway jobs, ${gatewayTimes.size} with exact time labels for ${dateNote}.`);

  const tickets = await fetchSupabaseTickets(supabaseUrl, serviceRoleKey);
  const repairs = buildRepairs(tickets, gatewayTimes, options.all);

  if (repairs.length === 0) {
    console.log("[loadrite-gateway-repair] No matching Supabase ticket times need repair.");
    return;
  }

  console.table(repairs.map((repair) => ({
    id: repair.id,
    status: repair.status,
    current: repair.currentDateTime,
    gateway: repair.completionLabel,
    repaired: repair.repairedDateTime,
  })));

  if (!options.apply) {
    console.log(`[loadrite-gateway-repair] Dry run only. Re-run with --apply to update ${repairs.length} ticket time(s).`);
    return;
  }

  for (const repair of repairs) {
    await updateTicketTime(supabaseUrl, serviceRoleKey, repair.id, repair.repairedDateTime);
  }

  console.log(`[loadrite-gateway-repair] Updated ${repairs.length} ticket time(s).`);
}

main().catch((error) => {
  console.error("[loadrite-gateway-repair]", error);
  process.exit(1);
});
