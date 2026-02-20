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
  Event?: string;
  GPSLatitude?: string;
  GPSLongitude?: string;
  Id?: string;
  Product?: string;
  "Scale ID"?: string;
  Sequence?: string;
  Time?: string;
  UserData1?: string;
  UserData2?: string;
  UserData3?: string;
  Weight?: string;
  
}

export interface LoadriteLoadingResponse {
  data?: LoadriteLoadingRecord[];
}

export async function getScaleDataLoading(
  site: string,
  startDate: string,
  endDate: string,
  page?: string
): Promise<LoadriteLoadingResponse | LoadriteLoadingRecord[]> {
  return callLoadrite("Loading", {
    Site: site,
    FromLocalTime: `${startDate} 00:00:00`,
    ToLocalTime: `${endDate} 23:59:59`,
    ...(page ? { Page: page } : {}),
  });
}
