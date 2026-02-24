import { useState, useCallback } from "react";
import { getScaleDataLoading, LoadriteLoadingRecord, LoadriteLoadingResponse } from "@/services/loadrite";
import { TicketData } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";

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
        note: currentNote,
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

function groupToTicketRow(group: LoadGroup, userId: string) {
  return {
    id: group.ticketNumber,
    user_id: userId,
    job_number: group.ticketNumber,
    job_name: "",
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

function dbRowToTicket(row: any): TicketData {
  return {
    id: row.id,
    jobNumber: row.job_number,
    jobName: row.job_name,
    dateTime: row.date_time,
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Just load from DB if not authenticated for Loadrite sync
        await loadFromDb();
        return;
      }

      const userId = session.user.id;
      const end = endDate ?? new Date().toISOString().split("T")[0];
      const start = startDate ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const response = await getScaleDataLoading("Green Hills Landscape - Menomonee Falls", start, end);

      let records: LoadriteLoadingRecord[];
      if (Array.isArray(response)) {
        records = response;
      } else if (response && typeof response === "object" && "data" in response && Array.isArray((response as LoadriteLoadingResponse).data)) {
        records = (response as LoadriteLoadingResponse).data!;
      } else {
        records = [];
      }

      const groups = groupRecordsIntoTickets(records);

      if (groups.length > 0) {
        const rows = groups.map((g) => groupToTicketRow(g, userId));

        const { error: upsertErr } = await supabase
          .from("tickets")
          .upsert(rows, { onConflict: "id" });

        if (upsertErr) {
          console.error("Upsert error:", upsertErr);
        }
      }

      // Always reload from DB to get the full picture
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
