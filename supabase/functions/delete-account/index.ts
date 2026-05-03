import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

const SHARED_TEMPLATE_NAME = "Global Print Template";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase function environment is not configured." }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await authedClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const userId = userData.user.id;

  try {
    const { error: templateVersionDeleteError } = await adminClient
      .from("template_versions")
      .delete()
      .eq("user_id", userId);

    if (templateVersionDeleteError) {
      throw templateVersionDeleteError;
    }

    const cleanupTargets = [
      ["audit_logs", adminClient.from("audit_logs").delete().eq("user_id", userId)],
      ["feedback", adminClient.from("feedback").delete().eq("user_id", userId)],
      ["tickets", adminClient.from("tickets").delete().eq("user_id", userId)],
      ["orders", adminClient.from("orders").delete().eq("user_id", userId)],
      ["customers", adminClient.from("customers").delete().eq("user_id", userId)],
      ["products", adminClient.from("products").delete().eq("user_id", userId)],
      ["trucks", adminClient.from("trucks").delete().eq("user_id", userId)],
      ["profiles", adminClient.from("profiles").delete().eq("user_id", userId)],
    ] as const;

    for (const [label, operation] of cleanupTargets) {
      const { error } = await operation;
      if (error) {
        console.error(`Failed deleting ${label} for user ${userId}`, error);
        throw error;
      }
    }

    const { error: templateDeleteError } = await adminClient
      .from("ticket_templates")
      .delete()
      .eq("user_id", userId)
      .neq("name", SHARED_TEMPLATE_NAME);

    if (templateDeleteError) {
      throw templateDeleteError;
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw deleteUserError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("delete-account failed", error);
    const message = error instanceof Error ? error.message : "Failed to delete account";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
