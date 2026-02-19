import { TicketData } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface TicketListProps {
  tickets: TicketData[];
  onSelect: (ticket: TicketData) => void;
  onDelete: (id: string) => void;
  onPreview: (ticket: TicketData) => void;
}

const statusColors: Record<TicketData["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  paid: "bg-success text-success-foreground",
  overdue: "bg-destructive text-destructive-foreground",
};

export function TicketList({ tickets, onSelect, onDelete, onPreview }: TicketListProps) {
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
    <div className="grid gap-3 animate-fade-in">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer"
          onClick={() => onSelect(ticket)}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{ticket.ticketNumber}</span>
              <Badge className={statusColors[ticket.status]} variant="secondary">
                {ticket.status}
              </Badge>
            </div>
            <span className="text-sm text-foreground truncate">{ticket.customerName}</span>
            <span className="text-xs text-muted-foreground">{ticket.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground mr-3 tabular-nums">
              ${ticket.total.toFixed(2)}
            </span>
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
              onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
