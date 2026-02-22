import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { to, subject, ticket } = await req.json();

    if (!to || !subject || !ticket) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, ticket" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build HTML email from ticket data
    const html = buildTicketEmailHtml(ticket);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ticket.companyEmail
          ? `${ticket.companyName} <${ticket.companyEmail}>`
          : "Ticket Printer <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: resendRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildTicketEmailHtml(ticket: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #333; border-collapse: collapse;">
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #ccc;">
        <table width="100%">
          <tr>
            <td>
              <strong style="font-size: 16px;">${ticket.companyName || ""}</strong><br/>
              <span style="font-size: 12px; color: #666;">${ticket.companyWebsite || ""}</span><br/>
              <span style="font-size: 12px; color: #666;">${ticket.companyEmail || ""}</span><br/>
              <span style="font-size: 12px; color: #666;">${ticket.companyPhone || ""}</span>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="font-size: 13px;">Ticket No:</span><br/>
              <strong style="font-size: 22px;">${ticket.jobNumber || ""}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #ccc;">
        <table width="100%" style="font-size: 13px;">
          <tr><td style="color: #666; width: 120px;">Job Name:</td><td><strong>${ticket.jobName || "—"}</strong></td></tr>
          <tr><td style="color: #666;">Date/Time:</td><td><strong>${ticket.dateTime || "—"}</strong></td></tr>
          <tr><td style="color: #666;">Customer:</td><td><strong>${ticket.customer || "—"}</strong></td></tr>
          <tr><td style="color: #666;">Truck:</td><td><strong>${ticket.truck || "—"}</strong></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #ccc;">
        <table width="100%">
          <tr>
            <td style="font-size: 13px; color: #666;">Product: <strong style="color: #222;">${ticket.product || "—"}</strong></td>
            <td style="text-align: right;">
              <strong style="font-size: 20px;">${ticket.totalAmount || "0.00"}</strong>
              <span style="font-size: 13px; margin-left: 8px;">${ticket.totalUnit || "Ton"}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${ticket.note ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #ccc; font-size: 13px;"><span style="color: #666;">Note:</span> ${ticket.note}</td></tr>` : ""}
    ${ticket.customerName ? `<tr><td style="padding: 12px 16px; font-size: 13px;"><span style="color: #666;">Received:</span> <strong>${ticket.customerName}</strong></td></tr>` : ""}
  </table>
  <p style="font-size: 11px; color: #999; margin-top: 16px;">Sent from ${ticket.companyName || "Ticket Printer"}</p>
</body>
</html>`;
}
