import { supabase } from "@/integrations/supabase/client";

interface LoadriteRequest {
  endpoint: string;
  [key: string]: string;
}

async function callLoadrite(params: LoadriteRequest) {
  const { data, error } = await supabase.functions.invoke("loadrite", {
    method: "POST",
    body: params,
  });

  if (error) {
    throw new Error(`Loadrite API error: ${error.message}`);
  }

  return data;
}

export async function getSites() {
  return callLoadrite({ endpoint: "context/get-sites" });
}

export async function getScales() {
  return callLoadrite({ endpoint: "context/get-scales" });
}

export async function getProducts() {
  return callLoadrite({ endpoint: "context/get-products" });
}

export interface ScaleDataParams {
  siteId: string;
  startDate: string;
  endDate: string;
  page?: string;
}

export async function getScaleDataLoading(params: ScaleDataParams) {
  return callLoadrite({
    endpoint: "scale-data/get-loading",
    siteId: params.siteId,
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.page ? { page: params.page } : {}),
  });
}

export async function getScaleDataConveyor(params: ScaleDataParams) {
  return callLoadrite({
    endpoint: "scale-data/get-conveyor",
    ...params,
  });
}

export async function getScaleDataHaul(params: ScaleDataParams) {
  return callLoadrite({
    endpoint: "scale-data/get-haul",
    ...params,
  });
}
