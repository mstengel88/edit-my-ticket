import { useState, useEffect } from "react";
import { TicketData, createEmptyTicket } from "@/types/ticket";
import { TicketList } from "@/components/TicketList";
import { TicketSidebar } from "@/components/TicketSidebar";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { Reports } from "@/components/Reports";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { ArrowLeft, Plus, RefreshCw, Loader2, BarChart3, FileClock, Package2, Truck, Users } from "lucide-react";
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
import { isStandardTruckName, normalizeTruckName } from "@/lib/truckName";
import { Badge } from "@/components/ui/badge";

type View = "list" | "editor" | "preview";

const Index = () => {
  const { tickets, loading, error, fetchData, loadFromDb } = useLoadriteData();
  const { signOut, session } = useAuth();
  const { isAdminOrManager } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { fields: templateFields, canvasElements, reportFields, copiesPerPage, canvasWidth, canvasHeight, emailElements, reportEmailConfig, printLayouts } = useTicketTemplate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<string>("tickets");
  const [pendingPrint, setPendingPrint] = useState(false);

  useEffect(() => { if (session) loadFromDb(); }, [loadFromDb, session]);
  useEffect(() => { if (error) toast.error(error); }, [error]);
  useEffect(() => {
    const requestedTicketId = location.state?.openTicketId as string | undefined;
    if (!requestedTicketId || loading) return;

    const requestedTicket = tickets.find((ticket) => ticket.id === requestedTicketId);
    if (!requestedTicket) return;

    setSelectedTicket({ ...requestedTicket });
    setView(isAdminOrManager ? "editor" : "preview");
    setActiveTab("tickets");
    navigate(location.pathname, { replace: true, state: null });
  }, [isAdminOrManager, loading, location.pathname, location.state, navigate, tickets]);
  useEffect(() => {
    if (!pendingPrint || view !== "preview" || !selectedTicket) return;

    const timeout = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("ticket-print-request"));
      setPendingPrint(false);
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [pendingPrint, view, selectedTicket]);

  const handleSelectTicket = (ticket: TicketData) => {
    setSelectedTicket({ ...ticket });
    setView("editor");
  };

  const handleNewTicket = async () => {
    // Find the next TM- number
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
    const jobNumber = `MT-${String(nextNumber).padStart(6, "0")}`;
    const newTicket = createEmptyTicket(jobNumber);
    if (session?.user) {
      const row = {
        id: newTicket.id,
        user_id: session.user.id,
        job_number: newTicket.jobNumber,
        job_name: newTicket.jobName,
        date_time: newTicket.dateTime,
        total_amount: newTicket.totalAmount,
        total_unit: newTicket.totalUnit,
        customer: newTicket.customer,
        product: newTicket.product,
        truck: newTicket.truck,
        note: newTicket.note,
        bucket: newTicket.bucket,
        customer_name: newTicket.customerName,
        customer_email: newTicket.customerEmail,
        customer_address: newTicket.customerAddress,
        signature: newTicket.signature,
        status: newTicket.status,
      };
      await supabase.from("tickets").insert(row);
      logAudit("create", "ticket", newTicket.id, { jobNumber: newTicket.jobNumber });
    }
    setSelectedTicket(newTicket);
    setView("editor");
    await loadFromDb();
  };

  const handleSaveTicket = async (updated: TicketData) => {
    const { error: err } = await supabase
      .from("tickets")
      .update({
        job_number: updated.jobNumber,
        job_name: updated.jobName,
        date_time: updated.dateTime,
        company_name: updated.companyName,
        company_email: updated.companyEmail,
        company_website: updated.companyWebsite,
        company_phone: updated.companyPhone,
        total_amount: updated.totalAmount,
        total_unit: updated.totalUnit,
        customer: updated.customer,
        product: updated.product,
        truck: updated.truck,
        note: updated.note,
        bucket: updated.bucket,
        customer_name: updated.customerName,
        customer_email: updated.customerEmail,
        customer_address: updated.customerAddress,
        signature: updated.signature,
        status: updated.status,
      })
      .eq("id", updated.id);

    if (err) {
      toast.error("Failed to save ticket");
      console.error(err);
      return;
    }

    const userId = session?.user?.id;
    if (userId) {
      if (updated.customer?.trim() && updated.customer !== "NOT SPECIFIED") {
        await supabase
          .from("customers")
          .upsert(
            { name: updated.customer, email: updated.customerEmail || "", user_id: userId },
            { onConflict: "name" }
          );
      }
      if (updated.product?.trim()) {
        await supabase
          .from("products")
          .upsert(
            { name: updated.product, user_id: userId, source: "manual" },
            { onConflict: "name" }
          );
      }
      const normalizedTruck = normalizeTruckName(updated.truck);
      if (
        normalizedTruck &&
        normalizedTruck !== "-" &&
        normalizedTruck !== "NOT SPECIFIED" &&
        isStandardTruckName(normalizedTruck)
      ) {
        await supabase
          .from("trucks")
          .upsert(
            { name: normalizedTruck, user_id: userId },
            { onConflict: "name,user_id" }
          );
      }
    }

    setSelectedTicket(updated);
    toast.success("Ticket saved!");
    logAudit("update", "ticket", updated.id, { jobNumber: updated.jobNumber });
    await loadFromDb();
  };

  const handleDeleteTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    await supabase.from("tickets").delete().eq("id", id);
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
    toast.info("Syncing from Loadrite...");
  };

  const handleStatusChange = async (ticket: TicketData, status: TicketData["status"]) => {
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

  const handlePrintTicket = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setView("preview");
    setPendingPrint(true);
  };

  const handleEmailTicket = async (ticket: TicketData) => {
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
        },
      });
      if (error) throw error;
      toast.success(`Email sent to ${ticket.customerEmail}!`);
    } catch (err: any) {
      console.error("Email send error:", err);
      toast.error(err?.message || "Failed to send email");
    }
  };

  // ─── Desktop split layout ───
  if (!isMobile && !isTablet) {
    const subtitle = `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}${loading ? " · syncing..." : ""}`;
    const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length;
    const completedCount = tickets.filter((ticket) => ticket.status === "completed").length;
    const customerCount = new Set(tickets.map((ticket) => ticket.customer?.trim()).filter(Boolean)).size;
    const productCount = new Set(tickets.map((ticket) => ticket.product?.trim()).filter(Boolean)).size;

    const headerExtra = (
      <>
        {isAdminOrManager && view !== "list" && (
          <Button variant="ghost" size="icon" onClick={handleBack} className="text-slate-200 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {isAdminOrManager && (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync
          </Button>
        )}
        {isAdminOrManager && (
          <Button size="sm" onClick={handleNewTicket} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        )}
      </>
    );

    return (
      <AppLayout title="Tickets" subtitle={subtitle} headerExtra={headerExtra}>
        <div className="flex h-[calc(100dvh-57px)] min-h-0">
          {/* Main content area */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl p-4 md:p-6 xl:p-8">
              {view === "list" && !selectedTicket && (
                <div className="space-y-6 animate-fade-in">
                  <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(135deg,rgba(17,28,45,0.98),rgba(11,21,36,0.98))] p-6 shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Ticket Desk</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                          Work the queue from one focused ticket console.
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          Select a ticket from the right to edit or preview it, or create a new one and keep the dispatch,
                          customer, and material details all in the same workflow.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                        {[
                          { label: "Pending", value: pendingCount, icon: FileClock },
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
                          <h3 className="mt-2 text-xl font-semibold text-white">Latest tickets in the queue</h3>
                        </div>
                      </div>
                      <div className="mt-5 space-y-3">
                        {tickets.slice(0, 6).map((ticket) => (
                          <button
                            key={ticket.id}
                            onClick={() => (isAdminOrManager ? handleSelectTicket(ticket) : handlePreview(ticket))}
                            className="grid w-full gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:bg-white/[0.06] md:grid-cols-[1.2fr_1fr_auto]"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">#{ticket.jobNumber}</p>
                              <p className="mt-1 truncate text-sm text-slate-300">{ticket.customer || "No customer"}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{ticket.dateTime}</p>
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

                    <section className="rounded-[26px] border border-white/8 bg-[#111c2d] p-5 shadow-xl shadow-black/10">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workflow Guidance</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Desk rhythm</h3>
                      <div className="mt-5 space-y-3">
                        {[
                          "Open a pending or draft ticket from the queue.",
                          "Confirm customer, PO, truck, and product before saving.",
                          "Print or email directly from the workbench once the load is confirmed.",
                          "Use Reports when you need a ticket query view across the full history.",
                        ].map((step, index) => (
                          <div key={step} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                              {index + 1}
                            </div>
                            <p className="text-sm leading-6 text-slate-300">{step}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 rounded-2xl border border-white/8 bg-[#0d1726] px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-cyan-300" />
                          <p className="text-sm font-semibold text-white">Truck activity is ready in the queue</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          Keep the right rail open as your live operational queue, then use the center pane for focused ticket work.
                        </p>
                      </div>
                    </section>
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
                  <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onPrint={handlePrintTicket} onEmail={handleEmailTicket} templateFields={templateFields} />
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
                      <TicketPreview ticket={selectedTicket} canvasElements={canvasElements} emailElements={emailElements} copiesPerPage={copiesPerPage} canvasWidth={canvasWidth} canvasHeight={canvasHeight} printLayouts={printLayouts} />
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
            tickets={tickets}
            selectedId={selectedTicket?.id}
            onSelect={isAdminOrManager ? handleSelectTicket : handlePreview}
            onDelete={handleDeleteTicket}
            onNew={handleNewTicket}
            onPrint={handlePrintTicket}
            onEmail={handleEmailTicket}
            onStatusChange={isAdminOrManager ? handleStatusChange : undefined}
            readOnly={!isAdminOrManager}
          />
        </div>
      </AppLayout>
    );
  }

  // ─── Mobile layout (unchanged) ───
  const subtitle = view === "list" && activeTab === "tickets"
    ? `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}${loading ? " · syncing..." : ""}`
    : undefined;

  const headerExtra = (
    <>
      {isAdminOrManager && view !== "list" && activeTab === "tickets" && (
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      {isAdminOrManager && view === "list" && activeTab === "tickets" && (
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
    <AppLayout title="Tickets" subtitle={subtitle} headerExtra={headerExtra}>
      <div className={`mx-auto w-full px-4 py-6 sm:px-6 ${isTablet ? "max-w-6xl" : "max-w-2xl"}`}>
        {view === "list" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`mb-4 ${isTablet ? "h-auto w-full justify-start rounded-xl p-1" : ""}`}>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              {isAdminOrManager && (
                <TabsTrigger value="reports" className="gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="tickets">
              <TicketList tickets={tickets} onSelect={handleSelectTicket} onDelete={handleDeleteTicket} onPreview={handlePreview} onPrint={handlePrintTicket} onEmail={handleEmailTicket} readOnly={!isAdminOrManager} />
            </TabsContent>
            {isAdminOrManager && (
              <TabsContent value="reports">
                <Reports tickets={tickets} reportFields={reportFields} reportEmailConfig={reportEmailConfig} />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <>
            {view === "editor" && selectedTicket && (
              <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onPrint={handlePrintTicket} onEmail={handleEmailTicket} templateFields={templateFields} />
            )}
            {view === "preview" && selectedTicket && (
              <TicketPreview ticket={selectedTicket} canvasElements={canvasElements} emailElements={emailElements} copiesPerPage={copiesPerPage} canvasWidth={canvasWidth} canvasHeight={canvasHeight} printLayouts={printLayouts} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
