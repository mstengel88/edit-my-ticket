import { useState, useEffect } from "react";
import { TicketData, createEmptyTicket } from "@/types/ticket";
import { TicketList } from "@/components/TicketList";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { Reports } from "@/components/Reports";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { ArrowLeft, Plus, RefreshCw, Loader2, LogOut, Settings, BarChart3, Menu, ClipboardList } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logAudit } from "@/lib/auditLog";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type View = "list" | "editor" | "preview";

const Index = () => {
  const { tickets, loading, error, fetchData, loadFromDb } = useLoadriteData();
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const { fields: templateFields, reportFields, copiesPerPage } = useTicketTemplate();
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<string>("tickets");

  // Load persisted tickets on mount
  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // Show errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSelectTicket = (ticket: TicketData) => {
    setSelectedTicket({ ...ticket });
    setView("editor");
  };

  const handleNewTicket = async () => {
    const newTicket = createEmptyTicket();
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

    // Sync lookup tables
    const userId = session?.user?.id;
    if (userId) {
      if (updated.customer?.trim() && updated.customer !== "NOT SPECIFIED") {
        await supabase
          .from("customers")
          .upsert(
            { name: updated.customer, email: updated.customerEmail || "", user_id: userId },
            { onConflict: "name,user_id" }
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
      if (updated.truck?.trim() && updated.truck !== "-" && updated.truck !== "NOT SPECIFIED") {
        await supabase
          .from("trucks")
          .upsert(
            { name: updated.truck, user_id: userId },
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm no-print">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {view !== "list" && activeTab === "tickets" && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Ticket Manager
              </h1>
              {view === "list" && activeTab === "tickets" && (
                <p className="text-xs text-muted-foreground">
                  {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                  {loading && " · syncing..."}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {view === "list" && activeTab === "tickets" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync
                </Button>
                <Button onClick={handleNewTicket} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Ticket
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/audit-log")}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Audit Log
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6">
        {view === "list" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tickets">
              <TicketList tickets={tickets} onSelect={handleSelectTicket} onDelete={handleDeleteTicket} onPreview={handlePreview} />
            </TabsContent>
            <TabsContent value="reports">
              <Reports tickets={tickets} reportFields={reportFields} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {view === "editor" && selectedTicket && (
              <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onPreview={handlePreview} templateFields={templateFields} />
            )}
            {view === "preview" && selectedTicket && (
              <TicketPreview ticket={selectedTicket} templateFields={templateFields} copiesPerPage={copiesPerPage} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
