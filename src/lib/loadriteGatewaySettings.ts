import { supabase } from "@/integrations/supabase/client";

const DEFAULT_GATEWAY_URL = "http://192.168.41.140";

interface LoadriteActivationSettings {
  gatewayUrl?: unknown;
}

function normalizeGatewayUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function getSavedLoadriteGatewayUrl(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "loadrite_activation")
      .maybeSingle();

    if (error) {
      console.warn("Could not load saved Loadrite gateway URL:", error);
      return DEFAULT_GATEWAY_URL;
    }

    const settings = data?.value as LoadriteActivationSettings | null | undefined;
    return normalizeGatewayUrl(settings?.gatewayUrl) ?? DEFAULT_GATEWAY_URL;
  } catch (error) {
    console.warn("Could not read saved Loadrite gateway URL:", error);
    return DEFAULT_GATEWAY_URL;
  }
}
