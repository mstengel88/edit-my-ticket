export function formatTicketDate(date) {
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function parseTimeOnly(label, now = new Date()) {
  const match = String(label ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes > 59) return null;

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const parsed = new Date(now);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

export function isDayMonthYearOnly(label) {
  return /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/.test(String(label ?? "").trim());
}

function hasExplicitTime(label) {
  return /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?\b/i.test(label) || /T\d{2}:\d{2}/.test(label);
}

// LCI replaces older completion times with a date-only label. Inventing noon
// for those labels corrupts existing tickets, so ambiguous values are skipped.
export function normalizeCompletionLabel(label, now = new Date()) {
  const raw = String(label ?? "").trim();
  if (!raw) return null;

  const timeOnly = parseTimeOnly(raw, now);
  if (timeOnly) return formatTicketDate(timeOnly);

  if (isDayMonthYearOnly(raw) || !hasExplicitTime(raw)) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : formatTicketDate(parsed);
}
