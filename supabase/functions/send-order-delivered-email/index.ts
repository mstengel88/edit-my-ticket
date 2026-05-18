import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeliveredTicketSummary {
  jobNumber: string;
  dateTime: string;
  issuedAt?: string | null;
  amount: string;
  unit: string;
  truck: string;
  status: string;
}

interface DeliveredOrderEmailPayload {
  companyName?: string;
  customer: string;
  customerEmail: string;
  product: string;
  poNumber: string;
  jobAddress: string;
  totalAmount: string;
  totalUnit: string;
  allocatedAmount: string;
  remainingAmount: string;
  deliveredAt: string;
  notes: string;
  tickets: DeliveredTicketSummary[];
}

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
    { global: { headers: { Authorization: authHeader } } },
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
    const { to, subject, order, senderEmail } = await req.json() as {
      to?: string;
      subject?: string;
      order?: DeliveredOrderEmailPayload;
      senderEmail?: string;
    };

    if (!to || !subject || !order) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, order" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = typeof senderEmail === "string" && senderEmail.trim()
      ? senderEmail.trim()
      : "info@greenhillssupply.com";

    const html = buildDeliveredOrderEmailHtml(order);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${order.companyName || "Green Hills Supply"} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send delivered order email", details: resendData }), {
        status: resendRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending delivered order email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildDeliveredOrderEmailHtml(order: DeliveredOrderEmailPayload) {
  const deliveredRows = order.tickets
    .map((ticket) => `
      <tr>
        <td style="padding:10px;border:1px solid #d9dde6;">${ticket.jobNumber}</td>
        <td style="padding:10px;border:1px solid #d9dde6;">${ticket.issuedAt || ticket.dateTime || "—"}</td>
        <td style="padding:10px;border:1px solid #d9dde6;">${ticket.amount} ${ticket.unit}</td>
        <td style="padding:10px;border:1px solid #d9dde6;">${ticket.truck || "—"}</td>
        <td style="padding:10px;border:1px solid #d9dde6;text-transform:capitalize;">${ticket.status}</td>
      </tr>
    `)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; max-width: 760px; margin: 0 auto; padding: 24px; background: #f8fafc;">
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
    <div style="padding: 24px 28px; background: #0f172a; color: #ffffff;">
      <p style="margin:0; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#7dd3fc;">Delivered Order</p>
      <h1 style="margin:10px 0 0; font-size:28px; line-height:1.2;">${order.customer}</h1>
      <p style="margin:8px 0 0; font-size:14px; color:#cbd5e1;">${order.product} · PO ${order.poNumber || "No PO"}</p>
    </div>

    <div style="padding: 24px 28px;">
      <p style="margin:0 0 18px; font-size:15px; line-height:1.6;">
        This order has been marked as delivered. Below is the delivery summary and the tickets that were pulled against it.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom: 22px;">
        <tr>
          <td style="padding:12px; border:1px solid #d9dde6; background:#f8fafc;"><strong>Ordered</strong><br/>${order.totalAmount} ${order.totalUnit}</td>
          <td style="padding:12px; border:1px solid #d9dde6; background:#f8fafc;"><strong>Delivered</strong><br/>${order.allocatedAmount} ${order.totalUnit}</td>
          <td style="padding:12px; border:1px solid #d9dde6; background:#f8fafc;"><strong>Remaining</strong><br/>${order.remainingAmount} ${order.totalUnit}</td>
          <td style="padding:12px; border:1px solid #d9dde6; background:#f8fafc;"><strong>Delivered At</strong><br/>${order.deliveredAt || "—"}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom: 22px;">
        <tr>
          <td style="padding:12px; border:1px solid #d9dde6;"><strong>Job Address</strong><br/>${order.jobAddress || "—"}</td>
          <td style="padding:12px; border:1px solid #d9dde6;"><strong>Customer Email</strong><br/>${order.customerEmail || "—"}</td>
        </tr>
      </table>

      ${order.notes ? `
        <div style="margin-bottom:22px; padding:14px 16px; border:1px solid #d9dde6; border-radius:12px; background:#f8fafc;">
          <strong>Order Notes</strong>
          <p style="margin:8px 0 0; font-size:14px; line-height:1.6;">${order.notes}</p>
        </div>
      ` : ""}

      <h2 style="margin:0 0 12px; font-size:18px;">Delivered Tickets</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th align="left" style="padding:10px;border:1px solid #d9dde6;">Ticket</th>
            <th align="left" style="padding:10px;border:1px solid #d9dde6;">Date / Time</th>
            <th align="left" style="padding:10px;border:1px solid #d9dde6;">Quantity</th>
            <th align="left" style="padding:10px;border:1px solid #d9dde6;">Truck</th>
            <th align="left" style="padding:10px;border:1px solid #d9dde6;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${deliveredRows || `
            <tr>
              <td colspan="5" style="padding:14px;border:1px solid #d9dde6;color:#64748b;">No delivered tickets were found for this order.</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
