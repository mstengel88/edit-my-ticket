import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const AGENT_SECRET = Deno.env.get("AGENT_SECRET")!;

export interface AgentRegistryRow {
  key: string;
  label: string;
  base_url: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  health_path: string;
}

export interface AgentHealth {
  ok: boolean;
  status: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
  error?: string;
}

export interface ResolvedAgent extends AgentRegistryRow {
  health: AgentHealth;
}

export async function hmacSign(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createAuthedClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function requireDeveloper(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, message: "Missing bearer token" };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return { ok: false as const, status: 401, message: "Empty bearer token" };
  }

  const supabase = createAuthedClient(token);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);

  if (userErr || !userData?.user) {
    return {
      ok: false as const,
      status: 401,
      message: userErr?.message || "Unauthorized",
    };
  }

  const userId = userData.user.id;
  const { data: isDev, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "developer",
  });

  if (roleErr) {
    return {
      ok: false as const,
      status: 500,
      message: roleErr.message,
    };
  }

  if (!isDev) {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, token, supabase, userId };
}

export async function listActiveAgents(supabase: ReturnType<typeof createAuthedClient>) {
  const { data, error } = await supabase
    .from("agent_registry")
    .select("key, label, base_url, is_active, is_default, priority, health_path")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as AgentRegistryRow[];
}

export async function checkAgentHealth(agent: AgentRegistryRow): Promise<AgentHealth> {
  const checkedAt = new Date().toISOString();
  const ts = Date.now().toString();
  const sig = await hmacSign(AGENT_SECRET, `${ts}.{}`);
  const started = Date.now();

  try {
    const response = await fetch(`${agent.base_url}${agent.health_path || "/metrics"}`, {
      method: "GET",
      headers: {
        "x-ts": ts,
        "x-sig": sig,
      },
    });

    return {
      ok: response.ok,
      status: response.status,
      responseTimeMs: Date.now() - started,
      checkedAt,
      error: response.ok ? undefined : `Health check returned ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      responseTimeMs: Date.now() - started,
      checkedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function withHealth(agents: AgentRegistryRow[]) {
  return await Promise.all(
    agents.map(async (agent) => ({
      ...agent,
      health: await checkAgentHealth(agent),
    })),
  );
}

export function pickPreferredAgent(agents: ResolvedAgent[]) {
  return (
    agents.find((agent) => agent.is_default && agent.health.ok) ||
    agents.find((agent) => agent.health.ok) ||
    agents.find((agent) => agent.is_default) ||
    agents[0] ||
    null
  );
}

export async function resolveAgent(
  supabase: ReturnType<typeof createAuthedClient>,
  requestedKey: string | null,
  options?: { allowFailover?: boolean },
) {
  const agents = await withHealth(await listActiveAgents(supabase));

  if (!agents.length) {
    throw new Error("No active agents configured");
  }

  const requested = requestedKey ? agents.find((agent) => agent.key === requestedKey) : null;
  const fallback = pickPreferredAgent(agents);

  if (!requested) {
    if (!fallback) {
      throw new Error("No available agents configured");
    }

    return {
      agent: fallback,
      selectedKey: fallback.key,
      failover: false,
      candidates: agents,
    };
  }

  if (requested.health.ok || !options?.allowFailover) {
    return {
      agent: requested,
      selectedKey: requested.key,
      failover: false,
      candidates: agents,
    };
  }

  if (fallback && fallback.key !== requested.key) {
    return {
      agent: fallback,
      selectedKey: fallback.key,
      failover: true,
      failedAgent: requested,
      candidates: agents,
    };
  }

  return {
    agent: requested,
    selectedKey: requested.key,
    failover: false,
    candidates: agents,
  };
}

export function jsonResponse(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    },
  });
}
