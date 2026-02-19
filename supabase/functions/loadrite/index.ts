const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOADRITE_BASE = "https://apicloud.loadrite-myinsighthq.com/api/v2";

Deno.serve(async (req: Request) => {
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

    let endpoint: string | null = null;
    const extraParams: Record<string, string> = {};

    if (req.method === "POST") {
      // Read endpoint and params from JSON body
      const body = await req.json();
      endpoint = body.endpoint || null;
      for (const [k, v] of Object.entries(body)) {
        if (k !== "endpoint" && typeof v === "string") {
          extraParams[k] = v;
        }
      }
    } else {
      // Read from query params
      const url = new URL(req.url);
      endpoint = url.searchParams.get("endpoint");
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== "endpoint") extraParams[key] = value;
      }
    }

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Missing 'endpoint' param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedPrefixes = ["context/", "scale-data/", "auth/"];
    const isAllowed = allowedPrefixes.some((p) => endpoint!.startsWith(p));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qs = new URLSearchParams(extraParams).toString();
    const targetUrl = `${LOADRITE_BASE}/${endpoint}${qs ? `?${qs}` : ""}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
