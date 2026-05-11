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
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
      setError(msg);
      console.error("Loadrite fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [loadFromDb]);

  return { tickets, loading, error, fetchData, loadFromDb };
}
