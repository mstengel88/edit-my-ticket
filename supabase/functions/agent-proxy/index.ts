import {
  corsHeaders,
  hmacSign,
  jsonResponse,
  requireDeveloper,
  resolveAgent,
} from "../_shared/agentRegistry.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const requestedAgentKey = url.searchParams.get("agent");
    const allowFailover = url.searchParams.get("failover") === "1";

    if (!path) {
      return jsonResponse({ error: "Missing path" }, 400);
    }

    const auth = await requireDeveloper(req);
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }

    const { agent, failover, failedAgent } = await resolveAgent(
      auth.supabase,
      requestedAgentKey,
      { allowFailover },
    );

    if (!agent.health.ok) {
      return jsonResponse(
        {
          error: `Agent ${agent.key} is unhealthy`,
          agent: agent.key,
          health: agent.health,
        },
        503,
      );
    }

    const bodyObj = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const body = JSON.stringify(bodyObj);
    const ts = Date.now().toString();
    const sig = await hmacSign(Deno.env.get("AGENT_SECRET")!, `${ts}.${body}`);

    const upstream = await fetch(`${agent.base_url}${path}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "x-ts": ts,
        "x-sig": sig,
      },
      body: req.method === "POST" ? body : undefined,
    });

    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "x-agent-key": agent.key,
        ...(failover && failedAgent
          ? { "x-agent-failover-from": failedAgent.key }
          : {}),
      },
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
});
