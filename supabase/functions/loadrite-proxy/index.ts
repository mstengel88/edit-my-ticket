import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOADRITE_BASE = "https://apicloud.loadrite-myinsighthq.com/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("LOADRITE_API_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "API token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Missing 'endpoint' query param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allowlist of valid endpoint prefixes
    const allowedPrefixes = ["context/", "scale-data/", "auth/"];
    const isAllowed = allowedPrefixes.some((p) => endpoint.startsWith(p));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward all query params except 'endpoint'
    const forwardParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint") forwardParams.set(key, value);
    }
    const qs = forwardParams.toString();
    const targetUrl = `${LOADRITE_BASE}/${endpoint}${qs ? `?${qs}` : ""}`;

    // Determine method and body
    let body: string | undefined;
    if (req.method === "PUT" || req.method === "POST") {
      body = await req.text();
    }

    const response = await fetch(targetUrl, {
      method: req.method === "PUT" || req.method === "POST" ? req.method : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body } : {}),
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
