import { useState } from "react";
import { TicketData, sampleTickets, createEmptyTicket } from "@/types/ticket";
import { TicketList } from "@/components/TicketList";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type View = "list" | "editor" | "preview";

const Index = () => {
  const [tickets, setTickets] = useState<TicketData[]>(sampleTickets);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [view, setView] = useState<View>("list");

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
    setTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setSelectedTicket(updated);
  };

  const handleDeleteTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
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
                  {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {view === "list" && (
            <Button onClick={handleNewTicket} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6">
        {view === "list" && (
          <TicketList tickets={tickets} onSelect={handleSelectTicket} onDelete={handleDeleteTicket} onPreview={handlePreview} />
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
