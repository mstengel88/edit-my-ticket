import { useState, useCallback, useEffect, useRef } from "react";
import { TicketData } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";
import { getAccessToken } from "@/lib/getAccessToken";
import { getSavedLoadriteGatewayUrl } from "@/lib/loadriteGatewaySettings";

function dbRowToTicket(row: any): TicketData {
  return {
    id: row.id,
    source: (row.source as TicketData["source"]) ?? "manual",
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

export interface TicketSyncResult {
  relaySynced: boolean;
  databaseRefreshed: boolean;
  warning?: string;
}

export function useLoadriteData(enabled = true) {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadInFlight = useRef<Promise<boolean> | null>(null);

  const loadFromDb = useCallback(async () => {
    if (loadInFlight.current) return loadInFlight.current;

    loadInFlight.current = (async () => {
      const { data, error: dbErr } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbErr) {
        const message = dbErr.message || "Tickets could not be loaded from the shared database.";
        console.error("DB load error:", dbErr);
        setError(message);
        return false;
      }

      setTickets((data ?? []).map(dbRowToTicket));
      setError(null);
      return true;
    })();

    try {
      return await loadInFlight.current;
    } finally {
      loadInFlight.current = null;
    }
  }, []);

  const fetchData = useCallback(async (startDate?: string, endDate?: string): Promise<TicketSyncResult> => {
    setLoading(true);
    setError(null);
    let relayWarning: string | undefined;

    try {
      const token = await getAccessToken();
      const gatewayUrl = await getSavedLoadriteGatewayUrl();
      const response = await fetch("/api/lci-sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gatewayUrl }),
      });
      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || text || "Failed to sync onsite Loadrite tickets");
      }
    } catch (err) {
      relayWarning = err instanceof Error ? err.message : "The onsite Loadrite relay could not be reached.";
      console.error("Ticket refresh error:", err, { startDate, endDate });
    }

    const databaseRefreshed = await loadFromDb();
    setLoading(false);

    if (!databaseRefreshed && relayWarning) {
      setError(`Ticket sync failed: ${relayWarning}`);
    }

    return {
      relaySynced: !relayWarning,
      databaseRefreshed,
      warning: relayWarning,
    };
  }, [loadFromDb]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadFromDb();
      }
    };

    const channel = supabase
      .channel("ticket-desk-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => void loadFromDb(),
      )
      .subscribe();

    const poll = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [enabled, loadFromDb]);

  return { tickets, loading, error, fetchData, loadFromDb };
}
