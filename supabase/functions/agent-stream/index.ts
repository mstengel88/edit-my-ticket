import {
  corsHeaders,
  hmacSign,
  requireDeveloper,
  resolveAgent,
} from "../_shared/agentRegistry.ts";

const ALLOWED_ACTIONS: Record<string, string> = {
  winterwatch: "deploy:winterwatch",
  tickets: "deploy:tickets",
  localdelivery: "deploy:localdelivery",
  shipcalc: "deploy:shipcalc",
};
const AGENT_SECRET = Deno.env.get("AGENT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sseHeaders = {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };

  try {
    const auth = await requireDeveloper(req);
    if (!auth.ok) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: auth.message })}\n\n`,
        { status: auth.status, headers: sseHeaders },
      );
    }

    const url = new URL(req.url);
    const target = url.searchParams.get("target");
    const requestedAgentKey = url.searchParams.get("agent");
    const agentAction = target ? ALLOWED_ACTIONS[target] : undefined;

    const { agent } = await resolveAgent(auth.supabase, requestedAgentKey);

    if (!agent.health.ok) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          message: `Agent ${agent.key} is unhealthy`,
          health: agent.health,
        })}\n\n`,
        { status: 503, headers: sseHeaders },
      );
    }

    if (!agentAction) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: `Invalid target: ${target}` })}\n\n`,
        { status: 400, headers: sseHeaders },
      );
    }

    const ts = Date.now().toString();
    const sig = await hmacSign(AGENT_SECRET, `${ts}.{}`);

    const upstream = await fetch(
      `${agent.base_url}/stream?action=${encodeURIComponent(agentAction)}`,
      {
        method: "GET",
        headers: {
          "x-ts": ts,
          "x-sig": sig,
        },
      },
    );

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          message: `Agent error ${upstream.status}`,
          body: txt,
        })}\n\n`,
        { status: 200, headers: sseHeaders },
      );
    }

    return new Response(upstream.body, { status: 200, headers: sseHeaders });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
      { status: 500, headers: sseHeaders },
    );
  }
});
