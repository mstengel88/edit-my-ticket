import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AGENTS: Record<string, string | undefined> = {
  primary: Deno.env.get("AGENT_URL"),
  second: Deno.env.get("AGENT2_URL"),
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

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const agentKey = url.searchParams.get("agent") || "primary";

    const agentBase = AGENTS[agentKey];

    if (!agentBase) {
      return new Response(
        JSON.stringify({ error: `Invalid agent: ${agentKey}` }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 🔐 AUTH CHECK
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabase.auth.getClaims(token);

    if (!claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid JWT" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 🔑 SIGN REQUEST TO AGENT
    const bodyObj =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const ts = Date.now().toString();
    const body = JSON.stringify(bodyObj);

    const sig = await hmacSign(
      Deno.env.get("AGENT_SECRET")!,
      `${ts}.${body}`
    );

    const upstream = await fetch(`${agentBase}${path}`, {
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
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});