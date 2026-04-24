import { useQuery } from "@tanstack/react-query";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/integrations/supabase/client";
import { getAccessToken } from "@/lib/getAccessToken";

export interface AgentHealth {
  ok: boolean;
  status: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
  error?: string;
}

export interface AgentRegistryEntry {
  key: string;
  label: string;
  baseUrl: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  healthPath: string;
  health: AgentHealth;
}

interface AgentRegistryResponse {
  agents: AgentRegistryEntry[];
  preferredAgentKey: string | null;
}

async function fetchAgentRegistry() {
  const token = await getAccessToken();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-registry`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  });

  const text = await response.text();
  let data: AgentRegistryResponse | { error?: string } | null = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      (data && "error" in data ? data.error : null) || text || "Failed to load agents",
    );
  }

  if (!data || !("agents" in data) || !Array.isArray(data.agents)) {
    throw new Error("Invalid agent registry response");
  }

  return data;
}

export function useAgentRegistry(enabled = true) {
  return useQuery({
    queryKey: ["agent-registry"],
    queryFn: fetchAgentRegistry,
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
