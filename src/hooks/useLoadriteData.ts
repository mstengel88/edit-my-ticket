import { useState, useCallback } from "react";
import { TicketData } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";

function dbRowToTicket(row: any): TicketData {
  return {
    id: row.id,
    jobNumber: row.job_number,
    jobName: row.job_name,
    dateTime: row.date_time,
    orderId: row.order_id,
    orderSequence: row.order_sequence,
    issuedAt: row.issued_at,
    companyName: row.company_name,
    companyEmail: row.company_email,
    companyWebsite: row.company_website,
    companyPhone: row.company_phone,
    totalAmount: row.total_amount,
    totalUnit: row.total_unit,
    customer: row.customer,
    product: row.product,
    truck: row.truck,
    note: row.note,
    bucket: row.bucket,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAddress: row.customer_address,
    signature: row.signature,
    status: row.status as TicketData["status"],
  };
}

async function getInvokeErrorMessage(err: unknown): Promise<string> {
  const fallback = err instanceof Error ? err.message : "Failed to fetch data";

  if (!err || typeof err !== "object" || !("context" in err)) {
    return fallback;
  }

  const context = (err as { context?: unknown }).context;
  if (!(context instanceof Response)) {
    return fallback;
  }

  try {
    const payload = await context.clone().json();
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Fall through to text parsing below.
  }

  try {
    const text = await context.clone().text();
    if (text.trim()) {
      return text;
    }
  } catch {
    // Keep the original error message when response parsing fails.
  }

  return fallback;
}

export function useLoadriteData() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromDb = useCallback(async () => {
    const { data, error: dbErr } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbErr) {
      console.error("DB load error:", dbErr);
      return;
    }

    if (data) {
      setTickets(data.map(dbRowToTicket));
    }
  }, []);

  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: syncError } = await supabase.functions.invoke("loadrite-sync", {
        body: {
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      });

      if (syncError) {
        throw syncError;
      }

      await loadFromDb();
    } catch (err) {
      const msg = await getInvokeErrorMessage(err);
      setError(msg);
      console.error("Loadrite fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [loadFromDb]);

  return { tickets, loading, error, fetchData, loadFromDb };
}
