import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_BASE = Deno.env.get("AGENT_URL")!;
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

  const { data: userData, error: userErr } = await supabase.auth.getUser();

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
    const container = url.searchParams.get("container");

    if (!container) {
      return new Response(
        `event: error\ndata: {"message":"Missing container"}\n\n`,
        { status: 400, headers: sseHeaders },
      );
    }

    const ts = Date.now().toString();
    const sig = await hmacSign(AGENT_SECRET, `${ts}.{}`);

    const upstream = await fetch(
      `${AGENT_BASE}/logs/stream?container=${encodeURIComponent(container)}`,
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
        `event: error\ndata: ${JSON.stringify({ message: `Agent error ${upstream.status}`, body: txt })}\n\n`,
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