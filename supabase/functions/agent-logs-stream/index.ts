import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_BASE = Deno.env.get("AGENT_URL")!;

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("event: error\ndata: {\"message\":\"Unauthorized\"}\n\n", {
        status: 401,
        headers: sseHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response("event: error\ndata: {\"message\":\"Unauthorized\"}\n\n", {
        status: 401,
        headers: sseHeaders,
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isDev } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "developer",
    });

    if (!isDev) {
      return new Response("event: error\ndata: {\"message\":\"Forbidden\"}\n\n", {
        status: 403,
        headers: sseHeaders,
      });
    }

    const url = new URL(req.url);
    const container = url.searchParams.get("container");
    if (!container) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: "missing_container" })}\n\n`,
        { status: 400, headers: sseHeaders },
      );
    }

    const agentUrl = `${AGENT_BASE}/logs/stream?container=${encodeURIComponent(container)}`;
    const upstream = await fetch(agentUrl);

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: `Agent error ${upstream.status}`, body: txt })}\n\n`,
        { status: 200, headers: sseHeaders },
      );
    }

    // Pipe upstream SSE → browser
    return new Response(upstream.body, { status: 200, headers: sseHeaders });
  } catch (e) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`,
      { status: 500, headers: sseHeaders },
    );
  }
});
