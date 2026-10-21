import { useState, useEffect, useRef } from "react";
import { TicketData, createEmptyTicket, formatTicketDateTime } from "@/types/ticket";
import { TicketList } from "@/components/TicketList";
import { TicketSidebar } from "@/components/TicketSidebar";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { Reports } from "@/components/Reports";
import { LoadriteGatewayDispatchForm } from "@/components/LoadriteGatewayDispatchForm";
import { useLoadriteData, dbRowToTicket } from "@/hooks/useLoadriteData";
import { ArrowLeft, Plus, RefreshCw, Loader2, BarChart3, FileClock, Package2, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import companyLogo from "@/assets/Greenhillssupply_logo.png";
import { useLocation, useNavigate } from "react-router-dom";
import { buildTruckRecord, isStandardTruckName, normalizeTruckName } from "@/lib/truckName";
import { Badge } from "@/components/ui/badge";
import {
  ghosTicketPermissions,
  useGhosPermission,
} from "@/components/GhosSsoBridge";

type View = "list" | "editor" | "preview";
type TicketSourceView = "all" | "manual" | "loadrite";

type DispatchTicketPrefill = {
  po: string;
  dispatchOrderId: string;
  customer: string;
  product: string;
  truck: string;
  totalAmount: string;
  totalUnit: string;
  customerAddress: string;
  customerEmail: string;
  note: string;
};

function ticketRowFromTicket(ticket: TicketData, userId: string) {
  return {
    id: ticket.id,
    user_id: userId,
    job_number: ticket.jobNumber,
    job_name: ticket.jobName,
    date_time: ticket.dateTime,
    order_id: ticket.orderId,
    order_sequence: ticket.orderSequence,
    issued_at: ticket.issuedAt,
    source: ticket.source ?? "manual",
    company_name: ticket.companyName,
    company_email: ticket.companyEmail,
    company_website: ticket.companyWebsite,
    company_phone: ticket.companyPhone,
    total_amount: ticket.totalAmount,
    total_unit: ticket.totalUnit,
    customer: ticket.customer,
    product: ticket.product,
    truck: ticket.truck,
    note: ticket.note,
    bucket: ticket.bucket,
    customer_name: ticket.customerName,
    customer_email: ticket.customerEmail,
    customer_address: ticket.customerAddress,
    signature: ticket.signature,
    status: ticket.status,
  };
}

function dispatchTicketPrefillFromSearch(search: string): DispatchTicketPrefill | null {
  const params = new URLSearchParams(search);
  const po = (params.get("po") || params.get("poNumber") || params.get("order") || "").trim();
  if (!po) return null;

  const loadedQuantity = (params.get("loadedQuantity") || params.get("quantity") || "").trim();
  return {
    po,
    dispatchOrderId: (params.get("dispatchOrderId") || "").trim(),
    customer: (params.get("customer") || "").trim(),
    product: (params.get("material") || "").trim(),
    truck: (params.get("truck") || "").trim(),
    totalAmount: loadedQuantity,
    totalUnit: (params.get("unit") || "").trim(),
    customerAddress: [params.get("address"), params.get("city")]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", "),
    customerEmail: (params.get("contact") || "").trim(),
    note: (params.get("route") ? `Dispatch route: ${params.get("route")}` : "").trim(),
  };
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function fetchEmbeddedTicketPreview(prefill: DispatchTicketPrefill) {
  const params = new URLSearchParams();
  params.set("po", prefill.po);
  if (prefill.dispatchOrderId) params.set("dispatchOrderId", prefill.dispatchOrderId);

  const response = await fetch(`/api/ticket-preview?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = await response.json();
  return payload?.ticket ?? null;
}

const Index = () => {
  const { tickets, loading, error, fetchData, loadFromDb } = useLoadriteData();
  const { signOut, session } = useAuth();
  const { isAdminOrManager, isAdmin } = useUserRole();
  const hasCreateEditPermission = useGhosPermission(ghosTicketPermissions.createEdit);
  const canPrintTickets = useGhosPermission(ghosTicketPermissions.print);
  const canEmailTickets = useGhosPermission(ghosTicketPermissions.email);
  const hasVoidPermission = useGhosPermission(ghosTicketPermissions.void);
  const canEditTickets = isAdmin ||
    (isAdminOrManager && hasCreateEditPermission);
  const canPrintTicketsWithAdmin = isAdmin || canPrintTickets;
  const canEmailTicketsWithAdmin = isAdmin || canEmailTickets;
  const canVoidTickets = isAdmin || hasVoidPermission;
  const location = useLocation();
  const navigate = useNavigate();
  const isTicketEmbed = new URLSearchParams(location.search).get("embed") === "ticket";
  const { fields: templateFields, canvasElements, reportFields, copiesPerPage, canvasWidth, canvasHeight, emailElements, reportEmailConfig, printLayouts } = useTicketTemplate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isBillableRoute = location.pathname === "/billable";
  const [sourceView, setSourceView] = useState<TicketSourceView>("all");
  const sourceFilteredTickets = sourceView === "all"
    ? tickets
    : tickets.filter((ticket) => (ticket.source ?? "manual") === sourceView);
  const visibleTickets = isBillableRoute
    ? sourceFilteredTickets.filter((ticket) => ticket.status === "billable")
    : sourceFilteredTickets;
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<string>("tickets");
  const [pendingPrint, setPendingPrint] = useState(false);
  const [ticketLookupError, setTicketLookupError] = useState("");
  const handledDispatchPrefillRef = useRef("");

  useEffect(() => { if (session) loadFromDb(); }, [loadFromDb, session]);
  useEffect(() => { if (error) toast.error(error); }, [error]);
  useEffect(() => {
    const requestedTicketId = location.state?.openTicketId as string | undefined;
    if (!requestedTicketId || loading) return;

    const requestedTicket = visibleTickets.find((ticket) => ticket.id === requestedTicketId);
    if (!requestedTicket) return;

    setSelectedTicket({ ...requestedTicket });
    setView(canEditTickets ? "editor" : "preview");
    setActiveTab("tickets");
    navigate(location.pathname, { replace: true, state: null });
  }, [canEditTickets, loading, location.pathname, location.state, navigate, visibleTickets]);
  useEffect(() => {
    if (!pendingPrint || view !== "preview" || !selectedTicket) return;

    const timeout = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("ticket-print-request"));
      setPendingPrint(false);
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [pendingPrint, view, selectedTicket]);

  const handleSelectTicket = (ticket: TicketData) => {
    if (!canEditTickets) {
      handlePreview(ticket);
      return;
    }
    setSelectedTicket({ ...ticket });
    setView("editor");
  };

  const getNextMtJobNumber = async () => {
    let nextNumber = 1;
    if (session?.user) {
      const { data: rows } = await supabase
        .from("tickets")
        .select("job_number")
        .like("job_number", "MT-%")
        .order("job_number", { ascending: false })
        .limit(1);
      if (rows && rows.length > 0) {
        const match = rows[0].job_number.match(/^MT-(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `MT-${String(nextNumber).padStart(6, "0")}`;
  };

  const createTicket = async (prefill?: Partial<TicketData>) => {
    const jobNumber = await getNextMtJobNumber();
    const newTicket = { ...createEmptyTicket(jobNumber), ...prefill };
    if (session?.user) {
      const { error: insertError } = await supabase.from("tickets").insert(ticketRowFromTicket(newTicket, session.user.id));
      if (insertError) {
        toast.error("Failed to create ticket");
        console.error(insertError);
        return null;
      }
      logAudit("create", "ticket", newTicket.id, { jobNumber: newTicket.jobNumber, po: newTicket.jobName });
    }
    setSelectedTicket(newTicket);
    setView("editor");
    await loadFromDb();
    return newTicket;
  };

  const handleNewTicket = async () => {
    if (!canEditTickets) {
      toast.error("Your GHOS role cannot create tickets.");
      return;
    }
    await createTicket();
  };

  useEffect(() => {
    const prefill = dispatchTicketPrefillFromSearch(location.search);
    if (!prefill) return;

    const prefillKey = `${prefill.dispatchOrderId || "po"}:${prefill.po}`;
    if (handledDispatchPrefillRef.current === prefillKey) return;
    handledDispatchPrefillRef.current = prefillKey;

    let cancelled = false;

    const openDispatchTicketByPo = async () => {
      setTicketLookupError("");
      let existingRow: any = null;

      if (isTicketEmbed) {
        try {
          existingRow = await fetchEmbeddedTicketPreview(prefill);
        } catch (error) {
          console.error("Embedded ticket lookup failed:", error);
        }
      }

      if (!existingRow && prefill.dispatchOrderId && looksLikeUuid(prefill.dispatchOrderId)) {
        const { data } = await supabase
          .from("tickets")
          .select("*")
          .eq("order_id", prefill.dispatchOrderId)
          .maybeSingle();
        existingRow = data;
      }

      if (!existingRow) {
        const { data } = await supabase
          .from("tickets")
          .select("*")
          .in("job_name", [prefill.po, `#${prefill.po}`])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existingRow = data;
      }

      if (cancelled) return;

      if (existingRow) {
        const existingTicket = dbRowToTicket(existingRow);
        setSelectedTicket(existingTicket);
        setView(isTicketEmbed ? "preview" : "editor");
        setActiveTab("tickets");
        if (!isTicketEmbed) {
          toast.success(`Opened loader ticket for PO #${prefill.po}`);
          navigate(location.pathname, { replace: true });
        }
      } else {
        const message = `No Loadrite ticket found yet for PO #${prefill.po}. Submit it from the scale first, then try again.`;
        setTicketLookupError(message);
        if (!isTicketEmbed) toast.error(message);
      }
    };

    void openDispatchTicketByPo();

    return () => {
      cancelled = true;
    };
  }, [isTicketEmbed, location.pathname, location.search, navigate]);

  const persistTicket = async (ticketToSave: TicketData, successMessage = "Ticket saved!") => {
    const { error: err } = await supabase
      .from("tickets")
      .update({
        job_number: ticketToSave.jobNumber,
        job_name: ticketToSave.jobName,
        date_time: ticketToSave.dateTime,
        order_id: ticketToSave.orderId,
        order_sequence: ticketToSave.orderSequence,
        issued_at: ticketToSave.issuedAt,
        company_name: ticketToSave.companyName,
        company_email: ticketToSave.companyEmail,
        company_website: ticketToSave.companyWebsite,
        company_phone: ticketToSave.companyPhone,
        total_amount: ticketToSave.totalAmount,
        total_unit: ticketToSave.totalUnit,
        customer: ticketToSave.customer,
        product: ticketToSave.product,
        truck: ticketToSave.truck,
        note: ticketToSave.note,
        bucket: ticketToSave.bucket,
        customer_name: ticketToSave.customerName,
        customer_email: ticketToSave.customerEmail,
        customer_address: ticketToSave.customerAddress,
        signature: ticketToSave.signature,
        status: ticketToSave.status,
      })
      .eq("id", ticketToSave.id);

    if (err) {
      toast.error("Failed to save ticket");
      console.error(err);
      return false;
    }

    const userId = session?.user?.id;
    if (userId) {
      if (ticketToSave.customer?.trim() && ticketToSave.customer !== "NOT SPECIFIED") {
        await supabase
          .from("customers")
          .upsert(
            { name: ticketToSave.customer, email: ticketToSave.customerEmail || "", user_id: userId },
            { onConflict: "name" }
          );
      }
      if (ticketToSave.product?.trim()) {
        await supabase
          .from("products")
          .upsert(
            { name: ticketToSave.product, user_id: userId, source: "manual" },
            { onConflict: "name" }
          );
      }
      const normalizedTruck = normalizeTruckName(ticketToSave.truck);
      if (
        normalizedTruck &&
        normalizedTruck !== "-" &&
        normalizedTruck !== "NOT SPECIFIED" &&
        isStandardTruckName(normalizedTruck)
      ) {
        await supabase
          .from("trucks")
          .upsert(
            { ...buildTruckRecord(normalizedTruck), user_id: userId },
            { onConflict: "normalized_name" }
          );
      }
    }

    setSelectedTicket(ticketToSave);
    logAudit("update", "ticket", ticketToSave.id, { jobNumber: ticketToSave.jobNumber });
    await loadFromDb();
    toast.success(successMessage);
    return true;
  };

  const handleSaveTicket = async (updated: TicketData) => {
    if (!canEditTickets) {
      toast.error("Your GHOS role cannot edit tickets.");
      return;
    }
    const ticketToSave: TicketData = {
      ...updated,
      status: updated.status === "draft" ? "pending" : updated.status,
    };
    await persistTicket(ticketToSave, "Ticket saved!");
  };

  const handleIssueTicket = async (updated: TicketData) => {
    if (!canEditTickets) {
      toast.error("Your GHOS role cannot issue tickets.");
      return;
    }
    const ticketToSave: TicketData = {
      ...updated,
      issuedAt: updated.issuedAt ?? new Date().toISOString(),
      dateTime: formatTicketDateTime(),
      status: updated.status === "draft" ? "pending" : updated.status,
    };
    await persistTicket(ticketToSave, "Ticket issued!");
  };

  const handleDeleteTicket = async (id: string) => {
    if (!canVoidTickets) {
      toast.error("Your GHOS role cannot void or delete tickets.");
      return;
    }

    const ticket = tickets.find(t => t.id === id);
    const { error: err } = await supabase.from("tickets").delete().eq("id", id);
    if (err) {
      toast.error("Failed to delete ticket");
      console.error(err);
      return;
    }

    logAudit("delete", "ticket", id, { jobNumber: ticket?.jobNumber });
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
      setView("list");
    }
    await loadFromDb();
  };

  const handlePreview = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setView("preview");
  };

  const handleBack = () => {
    if (view === "preview") setView("editor");
    else { setView("list"); setSelectedTicket(null); }
  };

  const handleRefresh = () => {
    fetchData();
    logAudit("sync", "ticket");
    toast.info("Refreshing tickets from the onsite relay...");
  };

  const handleStatusChange = async (ticket: TicketData, status: TicketData["status"]) => {
    if (!canEditTickets) {
      toast.error("Your GHOS role cannot change ticket status.");
      return;
    }
    const { error: err } = await supabase
      .from("tickets")
      .update({ status })
      .eq("id", ticket.id);
    if (err) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Ticket marked as ${status}`);
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket({ ...ticket, status });
    }
    await loadFromDb();
  };

  const manualTicketCount = tickets.filter((ticket) => (ticket.source ?? "manual") === "manual").length;
  const loadriteTicketCount = tickets.filter((ticket) => (ticket.source ?? "manual") === "loadrite").length;
  const sourceViewLabel = sourceView === "all" ? "All tickets" : sourceView === "manual" ? "Manual tickets" : "Loadrite tickets";

  const handlePrintTicket = (ticket: TicketData) => {
    if (!canPrintTicketsWithAdmin) {
      toast.error("Your GHOS role cannot print tickets.");
      return;
    }
    setSelectedTicket(ticket);
    setView("preview");
    setPendingPrint(true);
  };

  const handleEmailTicket = async (ticket: TicketData) => {
    if (!canEmailTicketsWithAdmin) {
      toast.error("Your GHOS role cannot email tickets.");
      return;
    }
    if (!ticket.customerEmail) {
      toast.error("No customer email set.");
      return;
    }
    try {
      let logoBase64 = "";
      try {
        const response = await fetch(companyLogo);
        const blob = await response.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.warn("Could not convert logo:", e); }

      const { error } = await supabase.functions.invoke("send-ticket-email", {
        body: {
          to: ticket.customerEmail,
          subject: `Ticket - Job #${ticket.jobNumber} from ${ticket.companyName}`,
          ticket,
          logoBase64,
          emailElements: emailElements || undefined,
          senderEmail: reportEmailConfig?.senderEmail || undefined,
        },
      });
      if (error) throw error;
      toast.success(`Email sent to ${ticket.customerEmail}!`);
    } catch (err: any) {
      console.error("Email send error:", err);
      toast.error(err?.message || "Failed to send email");
    }
  };

  if (isTicketEmbed) {
    const prefill = dispatchTicketPrefillFromSearch(location.search);

    return (
      <main className="min-h-screen bg-slate-950 p-4 text-white">
        {selectedTicket ? (
          <div className="mx-auto max-w-[980px] rounded-[24px] border border-white/10 bg-white p-3 shadow-2xl">
            <TicketPreview
              ticket={selectedTicket}
              canvasElements={canvasElements}
              emailElements={emailElements}
              senderEmail={reportEmailConfig?.senderEmail}
              copiesPerPage={1}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              printLayouts={printLayouts}
            />
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-white/10 bg-[#111c2d] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Loader Ticket</p>
            <h1 className="mt-3 text-2xl font-semibold">PO #{prefill?.po || "Unknown"}</h1>
            <p className="mt-4 text-slate-300">
              {ticketLookupError || "Looking for the Loadrite-created ticket..."}
            </p>
          </div>
        )}
      </main>
    );
  }

  // ─── Desktop split layout ───
  if (!isMobile && !isTablet) {
    const pageTitle = isBillableRoute ? "Billable" : "Tickets";
    const subtitle = `${visibleTickets.length} ticket${visibleTickets.length !== 1 ? "s" : ""}${loading ? " · syncing..." : ""}`;
    const pendingCount = visibleTickets.filter((ticket) => ticket.status === "pending").length;
    const completedCount = visibleTickets.filter((ticket) => ticket.status === "completed").length;
    const billableCount = visibleTickets.filter((ticket) => ticket.status === "billable").length;
    const customerCount = new Set(visibleTickets.map((ticket) => ticket.customer?.trim()).filter(Boolean)).size;
    const productCount = new Set(visibleTickets.map((ticket) => ticket.product?.trim()).filter(Boolean)).size;

    const headerExtra = (
      <>
        {canEditTickets && view !== "list" && (
          <Button variant="ghost" size="icon" onClick={handleBack} className="text-slate-200 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {canEditTickets && (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync
          </Button>
        )}
        {canEditTickets && (
          <Button size="sm" onClick={handleNewTicket} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        )}
      </>
    );

    return (
      <AppLayout title={pageTitle} subtitle={subtitle} headerExtra={headerExtra}>
        <div className="flex min-h-[calc(100dvh-57px)]">
          {/* Main content area */}
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-6xl p-4 md:p-6 xl:p-8">
              {view === "list" && !selectedTicket && (
                <div className="space-y-6 animate-fade-in">
                  <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(135deg,rgba(17,28,45,0.98),rgba(11,21,36,0.98))] p-6 shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">{isBillableRoute ? "Billing Queue" : "Ticket Desk"}</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                          {isBillableRoute ? "Review every billable ticket from one focused billing queue." : "Work the queue from one focused ticket console."}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {isBillableRoute
                            ? "Use this view to work only the tickets marked billable, then open, print, or update them without mixing them into the live dispatch queue."
                            : "Select a ticket from the right to edit or preview it, or create a new one and keep the dispatch, customer, and material details all in the same workflow."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {([
                            { key: "all", label: "All Tickets", count: tickets.length },
                            { key: "manual", label: "Manual", count: manualTicketCount },
                            { key: "loadrite", label: "Loadrite", count: loadriteTicketCount },
                          ] as const).map((item) => (
                            <Button
                              key={item.key}
                              variant="outline"
                              size="sm"
                              onClick={() => setSourceView(item.key)}
                              className={`gap-2 border-white/10 ${
                                sourceView === item.key
                                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                                  : "bg-white/5 text-white hover:bg-white/10"
                              }`}
                            >
                              {item.label}
                              <Badge className={`border-none ${sourceView === item.key ? "bg-slate-950/10 text-slate-900" : "bg-white/10 text-slate-200"} hover:bg-inherit`}>
                                {item.count}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                        {[
                          { label: isBillableRoute ? "Billable" : "Pending", value: isBillableRoute ? billableCount : pendingCount, icon: isBillableRoute ? BarChart3 : FileClock },
                          { label: "Completed", value: completedCount, icon: BarChart3 },
                          { label: "Customers", value: customerCount, icon: Users },
                          { label: "Products", value: productCount, icon: Package2 },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                              <item.icon className="h-4 w-4 text-cyan-300" />
                            </div>
                            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-[26px] border border-white/8 bg-[#111c2d] p-5 shadow-xl shadow-black/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recent Activity</p>
                          <h3 className="mt-2 text-xl font-semibold text-white">Latest {sourceViewLabel.toLowerCase()} in the queue</h3>
                        </div>
                      </div>
                      <div className="mt-5 space-y-3">
                        {visibleTickets.slice(0, 6).map((ticket) => (
                          <button
                            key={ticket.id}
                            onClick={() => (canEditTickets ? handleSelectTicket(ticket) : handlePreview(ticket))}
                            className="grid w-full gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:bg-white/[0.06] md:grid-cols-[1.2fr_1fr_auto]"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">#{ticket.jobNumber}</p>
                              <p className="mt-1 truncate text-sm text-slate-300">{ticket.customer || "No customer"}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{ticket.dateTime}</p>
                              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                                {(ticket.source ?? "manual") === "loadrite" ? "Loadrite" : "Manual"}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product / Truck</p>
                              <p className="mt-1 truncate text-sm text-slate-300">{ticket.product || "No product"}</p>
                              <p className="truncate text-xs text-slate-500">{ticket.truck || "No truck"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-white">{ticket.totalAmount}</p>
                              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{ticket.totalUnit}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    <LoadriteGatewayDispatchForm ticket={selectedTicket} />
                  </div>
                </div>
              )}
              {view === "editor" && selectedTicket && (
                <div className="space-y-5">
                  <section className="rounded-[28px] border border-white/8 bg-[#111c2d] p-5 shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                            Active Ticket
                          </Badge>
                          <Badge className="border-none bg-white/8 text-slate-200 capitalize hover:bg-white/8">
                            {selectedTicket.status}
                          </Badge>
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                          #{selectedTicket.jobNumber}
                        </h2>
                        <p className="mt-2 text-sm text-slate-300">
                          {selectedTicket.customer || "No customer assigned"} · {selectedTicket.product || "No product selected"}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "PO", value: selectedTicket.jobName || "No PO" },
                          { label: "Truck", value: selectedTicket.truck || "No truck" },
                          { label: "Amount", value: `${selectedTicket.totalAmount} ${selectedTicket.totalUnit}` },
                          { label: "When", value: selectedTicket.dateTime || "No timestamp" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                            <p className="mt-2 text-sm font-medium text-slate-200">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onIssue={handleIssueTicket} onPrint={handlePrintTicket} onEmail={handleEmailTicket} templateFields={templateFields} />
                </div>
              )}
              {view === "preview" && selectedTicket && (
                <div className="space-y-5">
                  <section className="rounded-[28px] border border-white/8 bg-[#111c2d] p-5 shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                            Print Preview
                          </Badge>
                          <Badge className="border-none bg-white/8 text-slate-200 hover:bg-white/8">
                            {copiesPerPage} per page
                          </Badge>
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                          Ticket #{selectedTicket.jobNumber}
                        </h2>
                        <p className="mt-2 text-sm text-slate-300">
                          Previewing the shared print template for {selectedTicket.customer || "this customer"}.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { label: "Customer", value: selectedTicket.customer || "No customer" },
                          { label: "Product", value: selectedTicket.product || "No product" },
                          { label: "Load", value: `${selectedTicket.totalAmount} ${selectedTicket.totalUnit}` },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                            <p className="mt-2 text-sm font-medium text-slate-200">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                    <div className="rounded-[28px] border border-white/8 bg-[#111c2d] p-5 shadow-2xl shadow-black/20">
                      <TicketPreview ticket={selectedTicket} canvasElements={canvasElements} emailElements={emailElements} senderEmail={reportEmailConfig?.senderEmail} copiesPerPage={copiesPerPage} canvasWidth={canvasWidth} canvasHeight={canvasHeight} printLayouts={printLayouts} />
                    </div>
                    <aside className="rounded-[28px] border border-white/8 bg-[#111c2d] p-5 shadow-2xl shadow-black/20">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Print Station</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Ready for output</h3>
                      <div className="mt-5 space-y-3">
                        {[
                          { label: "Copies Per Page", value: String(copiesPerPage) },
                          { label: "PO Number", value: selectedTicket.jobName || "No PO" },
                          { label: "Truck", value: selectedTicket.truck || "No truck" },
                          { label: "Customer Email", value: selectedTicket.customerEmail || "No email set" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                            <p className="mt-2 text-sm font-medium text-slate-200">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-400/5 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Output Notes</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          This preview is using the shared admin-managed print template, so what you see here is the same
                          layout other users will print from in the app.
                        </p>
                      </div>
                    </aside>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar with ticket list */}
          <TicketSidebar
            tickets={visibleTickets}
            selectedId={selectedTicket?.id}
            onSelect={canEditTickets ? handleSelectTicket : handlePreview}
            onDelete={handleDeleteTicket}
            onNew={handleNewTicket}
            onPrint={handlePrintTicket}
            onEmail={handleEmailTicket}
            onStatusChange={canEditTickets ? handleStatusChange : undefined}
            readOnly={!canEditTickets}
            canDelete={canVoidTickets}
          />
        </div>
      </AppLayout>
    );
  }

  // ─── Mobile layout (unchanged) ───
  const subtitle = view === "list" && activeTab === "tickets"
    ? `${visibleTickets.length} ticket${visibleTickets.length !== 1 ? "s" : ""}${loading ? " · syncing..." : ""}`
    : undefined;
  const pageTitle = isBillableRoute ? "Billable" : "Tickets";

  const headerExtra = (
    <>
      {canEditTickets && view !== "list" && activeTab === "tickets" && (
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      {canEditTickets && view === "list" && activeTab === "tickets" && (
        <>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync
          </Button>
          <Button onClick={handleNewTicket} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </>
      )}
    </>
  );

  return (
    <AppLayout title={pageTitle} subtitle={subtitle} headerExtra={headerExtra}>
      <div className={`mx-auto w-full px-4 py-6 sm:px-6 ${isTablet ? "max-w-6xl" : "max-w-2xl"}`}>
        {view === "list" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`mb-4 ${isTablet ? "h-auto w-full justify-start rounded-xl p-1" : ""}`}>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              {canEditTickets && (
                <TabsTrigger value="reports" className="gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="tickets">
              <div className="mb-4 flex flex-wrap gap-2">
                {([
                  { key: "all", label: "All", count: tickets.length },
                  { key: "manual", label: "Manual", count: manualTicketCount },
                  { key: "loadrite", label: "Loadrite", count: loadriteTicketCount },
                ] as const).map((item) => (
                  <Button
                    key={item.key}
                    variant="outline"
                    size="sm"
                    onClick={() => setSourceView(item.key)}
                    className={`gap-2 ${sourceView === item.key ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300" : ""}`}
                  >
                    {item.label}
                    <Badge className={`border-none ${sourceView === item.key ? "bg-slate-950/10 text-slate-900" : "bg-white/10 text-slate-200"} hover:bg-inherit`}>
                      {item.count}
                    </Badge>
                  </Button>
                ))}
              </div>
              <TicketList tickets={visibleTickets} onSelect={handleSelectTicket} onDelete={handleDeleteTicket} onPreview={handlePreview} onPrint={handlePrintTicket} onEmail={handleEmailTicket} readOnly={!canEditTickets} canDelete={canVoidTickets} />
            </TabsContent>
            {canEditTickets && (
              <TabsContent value="reports">
                <Reports tickets={visibleTickets} reportFields={reportFields} reportEmailConfig={reportEmailConfig} />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <>
            {view === "editor" && selectedTicket && (
              <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onIssue={handleIssueTicket} onPrint={handlePrintTicket} onEmail={handleEmailTicket} templateFields={templateFields} />
            )}
            {view === "preview" && selectedTicket && (
              <TicketPreview ticket={selectedTicket} canvasElements={canvasElements} emailElements={emailElements} senderEmail={reportEmailConfig?.senderEmail} copiesPerPage={copiesPerPage} canvasWidth={canvasWidth} canvasHeight={canvasHeight} printLayouts={printLayouts} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
