const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/loadrite`;

async function callLoadrite(endpoint: string, params?: Record<string, string>) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint, ...params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Loadrite API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getSites(): Promise<string[]> {
  return callLoadrite("context/get-sites");
}

export interface LoadriteScale {
  deviceSerialNumber: string;
  machineType: string;
  scaleDescription: string;
  scaleId: string;
  site: string;
  siteDescription: string;
  weightUnit: string;
}

export async function getScales(): Promise<LoadriteScale[]> {
  return callLoadrite("context/get-scales");
}

export interface LoadriteProduct {
  Description: string;
  Name: string;
  Site: string;
}

export async function getProducts(): Promise<LoadriteProduct[]> {
  return callLoadrite("context/get-products");
}

export interface LoadriteLoadingRecord {
  BucketWeights?: number[];
  Customer?: string;
  Date?: string;
  JobNumber?: string;
  JobName?: string;
  Note?: string;
  Operator?: string;
  Product?: string;
  Scale?: string;
  Site?: string;
  TicketNumber?: string;
  TotalWeight?: number;
  Truck?: string;
  WeightUnit?: string;
  [key: string]: unknown;
}

export interface LoadritePagedResponse {
  Data?: LoadriteLoadingRecord[];
  Meta?: {
    CurrentPage?: number;
    TotalPages?: number;
    TotalRecords?: number;
    IsCached?: boolean;
  };
}

export async function getScaleDataLoading(
  siteId: string,
  startDate: string,
  endDate: string,
  page?: string
): Promise<LoadritePagedResponse | LoadriteLoadingRecord[]> {
  return callLoadrite("scale-data/get-loading", {
    siteId,
    startDate,
    endDate,
    ...(page ? { page } : {}),
  });
}
