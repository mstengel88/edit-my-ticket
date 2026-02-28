import { useState } from "react";
import { TicketData } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Search, Plus, Printer, Mail } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type StatusFilter = "all" | "draft" | "pending" | "sent" | "completed";

interface TicketSidebarProps {
  tickets: TicketData[];
  selectedId?: string;
  onSelect: (ticket: TicketData) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  readOnly?: boolean;
}

const statusDot: Record<TicketData["status"], string> = {
  draft: "bg-muted-foreground",
  pending: "bg-warning",
  sent: "bg-accent-foreground",
  completed: "bg-success",
};

export function TicketSidebar({ tickets, selectedId, onSelect, onDelete, onNew, readOnly }: TicketSidebarProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.jobNumber.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q);
  });

  return (
    <>
      <aside className="w-80 shrink-0 border-l bg-card flex flex-col h-full">
        {/* Header */}
        <div className="px-3 py-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Tickets</h3>
            <span className="text-xs text-muted-foreground">{tickets.length}</span>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {!readOnly && (
            <Button onClick={onNew} size="sm" className="w-full gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Ticket
            </Button>
          )}
        </div>

        {/* Ticket list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onSelect(ticket)}
                className={`group relative rounded-md border p-2.5 cursor-pointer transition-colors text-xs ${
                  ticket.id === selectedId
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot[ticket.status]}`} />
                      <span className="font-semibold text-foreground truncate">#{ticket.jobNumber}</span>
                    </div>
                    <p className="text-muted-foreground truncate mt-0.5">{ticket.customer || "No customer"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground tabular-nums">{ticket.totalAmount}</span>
                    <span className="text-muted-foreground ml-0.5">{ticket.totalUnit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground truncate">{ticket.product}</span>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(ticket.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">No tickets found.</p>
            )}
          </div>
        </ScrollArea>
      </aside>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
