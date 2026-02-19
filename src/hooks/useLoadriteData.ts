import { useState, useEffect, useCallback } from "react";
import { getScaleDataLoading, LoadriteLoadingRecord, LoadritePagedResponse } from "@/services/loadrite";
import { TicketData } from "@/types/ticket";

function mapLoadriteToTicket(record: LoadriteLoadingRecord, index: number): TicketData {
  const dateStr = record.Date
    ? new Date(record.Date).toLocaleString("en-US", {
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

  const totalWeight = record.TotalWeight ?? 0;
  const unit = record.WeightUnit === "ShortTon" ? "Ton" : record.WeightUnit ?? "Ton";

  return {
    id: record.TicketNumber ?? `loadrite-${index}-${Date.now()}`,
    jobNumber: record.TicketNumber ?? record.JobNumber ?? String(index + 1),
    jobName: record.JobName ?? "Job",
    dateTime: dateStr,
    companyName: "Green Hills Supply",
    companyEmail: "order@greenhillsupply.com",
    companyWebsite: "www.GreenHillsSupply.com",
    companyPhone: "262-345-4001",
    totalAmount: totalWeight.toFixed(2),
    totalUnit: unit,
    customer: record.Customer ?? "",
    product: record.Product ?? "",
    truck: record.Truck ?? "NOT SPECIFIED",
    note: record.Note ?? "",
    bucket: record.BucketWeights
      ? record.BucketWeights.map((w, i) => `B${i + 1}: ${w}`).join(", ")
      : "",
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

      const response = await getScaleDataLoading("1", start, end);

      let records: LoadriteLoadingRecord[];
      if (Array.isArray(response)) {
        records = response;
      } else if (response.Data && Array.isArray(response.Data)) {
        records = response.Data;
      } else {
        records = [];
      }

      const mapped = records.map((r, i) => mapLoadriteToTicket(r, i));
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
