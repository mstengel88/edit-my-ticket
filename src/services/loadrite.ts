import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/loadrite-proxy`;

async function callProxy(endpoint: string, params?: Record<string, string>) {
  const url = new URL(BASE_URL);
  url.searchParams.set("endpoint", endpoint);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Loadrite API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getSites() {
  return callProxy("context/get-sites");
}

export async function getScales() {
  return callProxy("context/get-scales");
}

export async function getProducts() {
  return callProxy("context/get-products");
}

export interface ScaleDataParams {
  siteId: string;
  startDate: string; // ISO format
  endDate: string;
  page?: string;
}

export async function getScaleDataLoading(params: ScaleDataParams) {
  return callProxy("scale-data/get-loading", {
    siteId: params.siteId,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.page ? { page: params.page } : {}),
  });
}

export async function getScaleDataConveyor(params: ScaleDataParams) {
  return callProxy("scale-data/get-conveyor", {
    siteId: params.siteId,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.page ? { page: params.page } : {}),
  });
}

export async function getScaleDataHaul(params: ScaleDataParams) {
  return callProxy("scale-data/get-haul", {
    siteId: params.siteId,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.page ? { page: params.page } : {}),
  });
}
