import { useState } from "react";
import { TicketData } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Pencil, Trash2, Search } from "lucide-react";

interface TicketListProps {
  tickets: TicketData[];
  onSelect: (ticket: TicketData) => void;
  onDelete: (id: string) => void;
  onPreview: (ticket: TicketData) => void;
  readOnly?: boolean;
}

const statusColors: Record<TicketData["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  completed: "bg-success text-success-foreground",
};

export function TicketList({ tickets, onSelect, onDelete, onPreview }: TicketListProps) {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.jobNumber.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q)
    );
  });

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No tickets yet</h2>
        <p className="text-sm text-muted-foreground mt-1">Create your first ticket to get started.</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by ticket # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid gap-3">
        {filtered.map((ticket) => (
          <div
            key={ticket.id}
            className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer"
            onClick={() => onSelect(ticket)}
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">Job #{ticket.jobNumber}</span>
                <Badge className={statusColors[ticket.status]} variant="secondary">
                  {ticket.status}
                </Badge>
              </div>
              <span className="text-sm text-foreground truncate">{ticket.customer || "No customer"}</span>
              <span className="text-xs text-muted-foreground">{ticket.product} · {ticket.dateTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-3">
                <span className="text-lg font-bold text-foreground tabular-nums">{ticket.totalAmount}</span>
                <span className="text-sm text-muted-foreground ml-1">{ticket.totalUnit}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onPreview(ticket); }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onSelect(ticket); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={(e) => { e.stopPropagation(); setDeleteId(ticket.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No tickets match your search.</p>
        )}
      </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this ticket.
            </AlertDialogDescription>
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
