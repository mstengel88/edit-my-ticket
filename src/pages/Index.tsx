import { useState, useEffect } from "react";
import { TicketData, createEmptyTicket } from "@/types/ticket";
import { TicketList } from "@/components/TicketList";
import { TicketSidebar } from "@/components/TicketSidebar";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { Reports } from "@/components/Reports";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { ArrowLeft, Plus, RefreshCw, Loader2, BarChart3 } from "lucide-react";
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
import { normalizeTruckName } from "@/lib/truckName";

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
      if (normalizedTruck && normalizedTruck !== "-" && normalizedTruck !== "NOT SPECIFIED") {
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

    const headerExtra = (
      <>
        {isAdminOrManager && view !== "list" && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {isAdminOrManager && (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync
          </Button>
        )}
      </>
    );

    return (
      <AppLayout title="Tickets" subtitle={subtitle} headerExtra={headerExtra}>
        <div className="flex h-[calc(100dvh-57px)] min-h-0">
          {/* Main content area */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl p-4 md:p-6 xl:p-8">
              {view === "list" && !selectedTicket && (
                <div className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center animate-fade-in">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Select a ticket</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAdminOrManager ? "Choose a ticket from the sidebar to edit, or create a new one." : "Choose a ticket from the list to preview it."}
                  </p>
                </div>
              )}
              {view === "editor" && selectedTicket && (
                <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onPrint={handlePrintTicket} onEmail={handleEmailTicket} templateFields={templateFields} />
              )}
              {view === "preview" && selectedTicket && (
                <TicketPreview ticket={selectedTicket} canvasElements={canvasElements} emailElements={emailElements} copiesPerPage={copiesPerPage} canvasWidth={canvasWidth} canvasHeight={canvasHeight} printLayouts={printLayouts} />
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
