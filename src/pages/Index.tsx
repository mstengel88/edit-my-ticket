import { useState, useEffect } from "react";
import { TicketData, createEmptyTicket } from "@/types/ticket";
import { TicketList } from "@/components/TicketList";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { ArrowLeft, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type View = "list" | "editor" | "preview";

const Index = () => {
  const { tickets: apiTickets, loading, error, fetchData } = useLoadriteData();
  const [localTickets, setLocalTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [view, setView] = useState<View>("list");

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Merge API tickets with local edits
  const allTickets = [
    ...apiTickets.map((at) => {
      const local = localTickets.find((lt) => lt.id === at.id);
      return local ?? at;
    }),
    ...localTickets.filter((lt) => !apiTickets.some((at) => at.id === lt.id)),
  ];

  const handleSelectTicket = (ticket: TicketData) => {
    setSelectedTicket({ ...ticket });
    setView("editor");
  };

  const handleNewTicket = () => {
    const newTicket = createEmptyTicket();
    setSelectedTicket(newTicket);
    setView("editor");
  };

  const handleSaveTicket = (updated: TicketData) => {
    setLocalTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setSelectedTicket(updated);
    toast.success("Ticket saved!");
  };

  const handleDeleteTicket = (id: string) => {
    setLocalTickets((prev) => prev.filter((t) => t.id !== id));
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
      setView("list");
    }
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
    toast.info("Refreshing from Loadrite...");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm no-print">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Ticket Manager
              </h1>
              {view === "list" && (
                <p className="text-xs text-muted-foreground">
                  {allTickets.length} ticket{allTickets.length !== 1 ? "s" : ""}
                  {loading && " · syncing..."}
                </p>
              )}
            </div>
          </div>
          {view === "list" && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6">
        {view === "list" && (
          <TicketList tickets={allTickets} onSelect={handleSelectTicket} onDelete={handleDeleteTicket} onPreview={handlePreview} />
        )}
        {view === "editor" && selectedTicket && (
          <TicketEditor ticket={selectedTicket} onSave={handleSaveTicket} onPreview={handlePreview} />
        )}
        {view === "preview" && selectedTicket && (
          <TicketPreview ticket={selectedTicket} />
        )}
      </main>
    </div>
  );
};

export default Index;
