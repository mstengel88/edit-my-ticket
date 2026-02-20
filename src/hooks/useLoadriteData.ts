import { useState, useCallback } from "react";
import { getScaleDataLoading, LoadriteLoadingRecord, LoadriteLoadingResponse } from "@/services/loadrite";
import { TicketData } from "@/types/ticket";

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

function mapGroupToTicket(group: LoadGroup, index: number): TicketData {
  const dateStr = group.time
    ? new Date(group.time).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

  return {
    id: group.ticketNumber,
    jobNumber: group.ticketNumber,
    jobName: "Job",
    dateTime: dateStr,
    companyName: "Green Hills Supply",
    companyEmail: "order@greenhillsupply.com",
    companyWebsite: "www.GreenHillsSupply.com",
    companyPhone: "262-345-4001",
    totalAmount: group.totalWeight.toFixed(2),
    totalUnit: "Ton",
    customer: group.customer,
    product: group.product,
    truck: group.truck && group.truck !== "NOT SPECIFIED" ? group.truck : "-",
    note: group.note,
    bucket: group.bucketWeights.map((w, i) => `B${i + 1}: ${w}`).join(", "),
    customerName: "",
    customerAddress: "",
    signature: "",
    status: "completed",
  };
}

export function useLoadriteData() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);

    try {
      const end = endDate ?? new Date().toISOString().split("T")[0];
      const start =
        startDate ??
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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
      const mapped = groups.map((g, i) => mapGroupToTicket(g, i));
      setTickets(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
      setError(msg);
      console.error("Loadrite fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, error, fetchData };
}
