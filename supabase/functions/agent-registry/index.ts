import {
  corsHeaders,
  jsonResponse,
  pickPreferredAgent,
  requireDeveloper,
  withHealth,
  listActiveAgents,
} from "../_shared/agentRegistry.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await requireDeveloper(req);
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }

    const agents = await withHealth(await listActiveAgents(auth.supabase));
    const preferred = pickPreferredAgent(agents);

    return jsonResponse({
      agents: agents.map((agent) => ({
        key: agent.key,
        label: agent.label,
        baseUrl: agent.base_url,
        isActive: agent.is_active,
        isDefault: agent.is_default,
        priority: agent.priority,
        healthPath: agent.health_path,
        health: agent.health,
      })),
      preferredAgentKey: preferred?.key || null,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
