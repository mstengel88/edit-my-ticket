import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENTS: Record<string, string | undefined> = {
  primary: Deno.env.get("AGENT_URL"),
  second: Deno.env.get("AGENT2_URL"),
};

const AGENT_SECRET = Deno.env.get("AGENT_SECRET")!;

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

async function requireDeveloper(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Missing bearer token" };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return { ok: false, status: 401, message: "Empty bearer token" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);

  if (userErr || !userData?.user) {
    return {
      ok: false,
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
      ok: false,
      status: 500,
      message: roleErr.message,
    };
  }

  if (!isDev) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await requireDeveloper(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const agentKey = url.searchParams.get("agent") || "primary";
    const agentBase = AGENTS[agentKey];

    if (!path || !path.startsWith("/")) {
      return new Response(JSON.stringify({ error: "Missing or invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!agentBase) {
      return new Response(JSON.stringify({ error: `Unknown agent: ${agentKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedPrefixes = [
      "/deploys",
      "/status",
      "/metrics",
      "/containers",
      "/container/",
      "/service/",
    ];

    if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
      return new Response(JSON.stringify({ error: "Path not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyObj = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const ts = Date.now().toString();
    const body = JSON.stringify(bodyObj);
    const sig = await hmacSign(AGENT_SECRET, `${ts}.${body}`);

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
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});