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
    const { to, subject, report, reportEmailConfig } = await req.json();

    if (!to || !subject || !report) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, report" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = {
      showSummaryCards: true,
      showCustomerBreakdown: true,
      showProductBreakdown: true,
      showTicketDetails: true,
      headerColor: "#222222",
      accentColor: "#f5f5f5",
      ...reportEmailConfig,
    };

    const html = buildReportEmailHtml(report, config);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${report.companyName || "Ticket Manager"} <tickets@ticketing.ghstickets.info>`,
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
    console.error("Error sending report email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ReportData {
  companyName?: string;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  customerFilter?: string;
  totalTickets: number;
  totalTons: string;
  totalYards: string;
  byCustomer: { name: string; count: number; tons: string; yards: string }[];
  byProduct: { name: string; count: number; tons: string; yards: string }[];
  tickets: { jobNumber: string; dateTime: string; customer: string; product: string; amount: string; unit: string; truck: string }[];
}

interface EmailConfig {
  showSummaryCards: boolean;
  showCustomerBreakdown: boolean;
  showProductBreakdown: boolean;
  showTicketDetails: boolean;
  headerColor: string;
  accentColor: string;
}

function buildReportEmailHtml(report: ReportData, config: EmailConfig): string {
  const { headerColor, accentColor } = config;

  const summaryHtml = config.showSummaryCards ? `
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:12px;background:${accentColor};text-align:center;border:1px solid #ddd;"><strong style="font-size:22px;color:${headerColor};">${report.totalTickets}</strong><br/><span style="font-size:12px;color:#666;">Tickets</span></td>
      <td style="padding:12px;background:${accentColor};text-align:center;border:1px solid #ddd;"><strong style="font-size:22px;color:${headerColor};">${report.totalTons}</strong><br/><span style="font-size:12px;color:#666;">Tons</span></td>
      <td style="padding:12px;background:${accentColor};text-align:center;border:1px solid #ddd;"><strong style="font-size:22px;color:${headerColor};">${report.totalYards}</strong><br/><span style="font-size:12px;color:#666;">Yards</span></td>
    </tr>
  </table>` : "";

  const customerRows = report.byCustomer
    .map((c) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;">${c.name}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${c.count}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${c.tons}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${c.yards}</td></tr>`)
    .join("");

  const customerHtml = config.showCustomerBreakdown && customerRows ? `
  <h3 style="font-size:14px;margin:0 0 8px;color:${headerColor};">By Customer</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
    <tr style="background:${accentColor};"><th style="padding:6px 8px;text-align:left;">Customer</th><th style="padding:6px 8px;text-align:right;">Tickets</th><th style="padding:6px 8px;text-align:right;">Tons</th><th style="padding:6px 8px;text-align:right;">Yards</th></tr>
    ${customerRows}
  </table>` : "";

  const productRows = report.byProduct
    .map((p) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;">${p.name}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${p.count}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${p.tons}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${p.yards}</td></tr>`)
    .join("");

  const productHtml = config.showProductBreakdown && productRows ? `
  <h3 style="font-size:14px;margin:0 0 8px;color:${headerColor};">By Product</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
    <tr style="background:${accentColor};"><th style="padding:6px 8px;text-align:left;">Product</th><th style="padding:6px 8px;text-align:right;">Tickets</th><th style="padding:6px 8px;text-align:right;">Tons</th><th style="padding:6px 8px;text-align:right;">Yards</th></tr>
    ${productRows}
  </table>` : "";

  const ticketRows = report.tickets
    .map((t) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.jobNumber}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.dateTime}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.customer}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.product}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${t.amount}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.unit}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.truck}</td></tr>`)
    .join("");

  const ticketHtml = config.showTicketDetails && ticketRows ? `
  <h3 style="font-size:14px;margin:0 0 8px;color:${headerColor};">Ticket Details</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:${accentColor};"><th style="padding:6px 8px;text-align:left;">Job#</th><th style="padding:6px 8px;text-align:left;">Date</th><th style="padding:6px 8px;text-align:left;">Customer</th><th style="padding:6px 8px;text-align:left;">Product</th><th style="padding:6px 8px;text-align:right;">Amount</th><th style="padding:6px 8px;text-align:left;">Unit</th><th style="padding:6px 8px;text-align:left;">Truck</th></tr>
    ${ticketRows}
  </table>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:800px;margin:0 auto;padding:20px;">
  <h2 style="margin:0 0 4px;color:${headerColor};">${report.companyName || "Ticket Manager"} – Report</h2>
  <p style="color:#666;font-size:13px;margin:0 0 16px;">${report.periodLabel}: ${report.dateFrom} – ${report.dateTo}${report.customerFilter ? ` | Customer: ${report.customerFilter}` : ""}</p>

  ${summaryHtml}
  ${customerHtml}
  ${productHtml}
  ${ticketHtml}

  <p style="font-size:11px;color:#999;margin-top:24px;">Sent from ${report.companyName || "Ticket Manager"}</p>
</body>
</html>`;
}
