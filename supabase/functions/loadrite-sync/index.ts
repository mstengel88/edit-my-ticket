import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

const LOADRITE_BASE = "https://apicloud.loadrite-myinsighthq.com/api/v2";
const DEFAULT_SITE = Deno.env.get("LOADRITE_SYNC_SITE") ?? "Green Hills Landscape - Menomonee Falls";
const DEFAULT_LOOKBACK_DAYS = Number.parseInt(Deno.env.get("LOADRITE_SYNC_LOOKBACK_DAYS") ?? "7", 10);

interface LoadriteLoadingRecord {
  Event?: string;
  Id?: string;
  Product?: string;
  Sequence?: string;
  Time?: string;
  UserData1?: string;
  UserData2?: string;
  UserData3?: string;
  Weight?: string;
}

interface LoadGroup {
  ticketNumber: string;
  product: string;
  customer: string;
  truck: string;
  totalWeight: number;
  time: string;
  bucketWeights: number[];
  note: string;
}

function formatDate(time: string): string {
  const d = time ? new Date(time) : new Date();
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function groupRecordsIntoTickets(records: LoadriteLoadingRecord[]): LoadGroup[] {
  const groups: LoadGroup[] = [];
  let currentBuckets: number[] = [];
  let currentProduct = "";
  let currentCustomer = "";
  let currentTruck = "";
  let currentNote = "";

  for (const rec of records) {
    if (rec.Event === "Add") {
      currentBuckets.push(parseFloat(rec.Weight ?? "0"));
      currentProduct = rec.Product ?? currentProduct;
      currentCustomer = rec.UserData1 ?? currentCustomer;
      currentTruck = rec.UserData2 ?? currentTruck;
      currentNote = rec.UserData3 ?? currentNote;
    } else if (rec.Event === "Short Total") {
      groups.push({
        ticketNumber: rec.Sequence ?? `LR-${rec.Id}`,
        product: rec.Product ?? currentProduct,
        customer: rec.UserData1 ?? currentCustomer,
        truck: rec.UserData2 ?? currentTruck,
        totalWeight: parseFloat(rec.Weight ?? "0"),
        time: rec.Time ?? "",
        bucketWeights: [...currentBuckets],
        note: rec.UserData3 ?? currentNote,
      });
      currentBuckets = [];
      currentProduct = "";
      currentCustomer = "";
      currentTruck = "";
      currentNote = "";
    }
  }

  return groups;
}

function groupToTicketRow(group: LoadGroup, userId: string) {
  return {
    id: group.ticketNumber,
    source: "loadrite",
    user_id: userId,
    job_number: group.ticketNumber,
    job_name: group.note,
    date_time: formatDate(group.time),
    total_amount: group.totalWeight.toFixed(2),
    total_unit: "Ton",
    customer: group.customer,
    product: group.product,
    truck: group.truck && group.truck !== "NOT SPECIFIED" ? group.truck : "-",
    note: group.note,
    bucket: group.bucketWeights.map((w, i) => `B${i + 1}: ${w}`).join(", "),
    status: "pending",
  };
}

function parseTicketDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isNoonTimestamp(value: unknown): boolean {
  const parsed = parseTicketDate(value);
  return Boolean(parsed && parsed.getHours() === 12 && parsed.getMinutes() === 0);
}

function dateOnly(value: Date) {
  return value.toISOString().split("T")[0];
}

async function fetchLoadingRecords(
  token: string,
  site: string,
  fromDate: string,
  toDate: string,
): Promise<LoadriteLoadingRecord[]> {
  const params = new URLSearchParams({
    Site: site,
    FromLocalTime: `${fromDate} 00:00:00`,
    ToLocalTime: `${toDate} 23:59:59`,
  });

  const response = await fetch(`${LOADRITE_BASE}/Loading?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404 || response.status === 204) {
    return [];
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Loadrite API error (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload as LoadriteLoadingRecord[];
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data as LoadriteLoadingRecord[];
  }

  return [];
}

async function repairSupabaseTicketTimes(
  adminClient: ReturnType<typeof createClient>,
  groups: LoadGroup[],
  updateAll: boolean,
  apply: boolean,
) {
  const loadriteTimeByTicket = new Map(
    groups
      .filter((group) => group.ticketNumber && group.time)
      .map((group) => [group.ticketNumber, formatDate(group.time)]),
  );

  const { data: tickets, error: lookupErr } = await adminClient
    .from("tickets")
    .select("id, job_number, date_time, status, source")
    .eq("source", "loadrite")
    .limit(10000);

  if (lookupErr) throw lookupErr;

  const repairs = (tickets ?? []).flatMap((ticket) => {
    const repairedDateTime =
      loadriteTimeByTicket.get(String(ticket.id ?? "").trim())
      ?? loadriteTimeByTicket.get(String(ticket.job_number ?? "").trim());

    if (!repairedDateTime) return [];
    if (!updateAll && !isNoonTimestamp(ticket.date_time)) return [];
    if (String(ticket.date_time ?? "").trim() === repairedDateTime) return [];

    return [{
      id: ticket.id,
      jobNumber: ticket.job_number,
      status: ticket.status,
      currentDateTime: ticket.date_time,
      repairedDateTime,
    }];
  });

  if (apply) {
    for (const repair of repairs) {
      const { error: updateErr } = await adminClient
        .from("tickets")
        .update({ date_time: repair.repairedDateTime })
        .eq("id", repair.id);

      if (updateErr) throw updateErr;
    }
  }

  return repairs;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("LOADRITE_SYNC_SERVICE_ROLE_KEY")
      ?? Deno.env.get("SERVICE_ROLE_KEY")
      ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const loadriteToken = Deno.env.get("LOADRITE_API_TOKEN");
    const syncUserId = Deno.env.get("LOADRITE_SYNC_USER_ID");

    if (!supabaseUrl || !serviceRoleKey || !loadriteToken) {
      return new Response(
        JSON.stringify({
          error: "Missing one or more required settings: SUPABASE_URL, LOADRITE_SYNC_SERVICE_ROLE_KEY, LOADRITE_API_TOKEN",
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const site = typeof body.site === "string" && body.site.trim() ? body.site.trim() : DEFAULT_SITE;
    const toDate = typeof body.endDate === "string" && body.endDate.trim()
      ? body.endDate.trim()
      : dateOnly(new Date());

    const defaultStartDate = dateOnly(
      new Date(Date.now() - Math.max(DEFAULT_LOOKBACK_DAYS, 1) * 24 * 60 * 60 * 1000),
    );
    const fromDate = typeof body.startDate === "string" && body.startDate.trim()
      ? body.startDate.trim()
      : defaultStartDate;

    const records = await fetchLoadingRecords(loadriteToken, site, fromDate, toDate);
    const groups = groupRecordsIntoTickets(records);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const repairTimes = body.repairTimes === true || body.mode === "repair-times";

    if (repairTimes) {
      const repairs = await repairSupabaseTicketTimes(
        adminClient,
        groups,
        body.allTimes === true,
        body.apply === true,
      );

      return new Response(
        JSON.stringify({
          success: true,
          mode: "repair-times",
          applied: body.apply === true,
          site,
          fromDate,
          toDate,
          records: records.length,
          groupedTickets: groups.length,
          repairCandidates: repairs.length,
          repairs,
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    if (!syncUserId) {
      return new Response(
        JSON.stringify({
          error: "Missing required setting: LOADRITE_SYNC_USER_ID",
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const rows = groups.map((group) => groupToTicketRow(group, syncUserId));

    if (rows.length > 0) {
      const { error: upsertErr } = await adminClient
        .from("tickets")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true });

      if (upsertErr) {
        throw upsertErr;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        site,
        fromDate,
        toDate,
        records: records.length,
        groupedTickets: groups.length,
        insertedCandidates: rows.length,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("loadrite-sync failed", error);
    const message = error instanceof Error ? error.message : "Failed to sync from Loadrite";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
