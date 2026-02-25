import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_BASE = Deno.env.get("AGENT_URL")!; // reuse existing secret
const AGENT_SECRET = Deno.env.get("AGENT_SECRET")!;

const ALLOWED_ACTIONS: Record<string, string> = {
  winterwatch: "deploy:winterwatch",
  tickets: "deploy:tickets",
};

async function hmacSign(secret: string, message: string): Promise<string> {
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
    // Auth check
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

    // Parse action from query param
    const url = new URL(req.url);
    const target = url.searchParams.get("target");
    const agentAction = target ? ALLOWED_ACTIONS[target] : undefined;

    if (!agentAction) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: `Invalid target: ${target}` })}\n\n`,
        { status: 400, headers: sseHeaders },
      );
    }

    // Sign request
    const ts = Date.now().toString();
    const body = "{}";
    const sig = await hmacSign(AGENT_SECRET, `${ts}.${body}`);

    const agentUrl = `${AGENT_BASE}/stream?action=${encodeURIComponent(agentAction)}`;
    const upstream = await fetch(agentUrl, {
      method: "GET",
      headers: { "x-ts": ts, "x-sig": sig },
    });

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
