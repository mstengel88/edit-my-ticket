import { useState } from "react";
import { TicketData } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Search, Plus, Printer, Mail, CheckCircle2 } from "lucide-react";

type StatusFilter = "all" | "draft" | "pending" | "sent" | "completed";

interface TicketSidebarProps {
  tickets: TicketData[];
  selectedId?: string;
  onSelect: (ticket: TicketData) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onPrint: (ticket: TicketData) => void;
  onEmail: (ticket: TicketData) => void;
  onStatusChange?: (ticket: TicketData, status: TicketData["status"]) => void;
  readOnly?: boolean;
}

const statusDot: Record<TicketData["status"], string> = {
  draft: "bg-muted-foreground",
  pending: "bg-warning",
  sent: "bg-accent-foreground",
  completed: "bg-success",
};

const compactUnitLabel: Record<string, string> = {
  Yardage: "Yds",
  Ton: "Tons",
  Gallons: "Gal",
};

export function TicketSidebar({ tickets, selectedId, onSelect, onDelete, onNew, onPrint, onEmail, onStatusChange, readOnly }: TicketSidebarProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [emailTicket, setEmailTicket] = useState<TicketData | null>(null);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.jobNumber.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q) ||
      t.product.toLowerCase().includes(q) ||
      t.truck.toLowerCase().includes(q) ||
      t.jobName.toLowerCase().includes(q) ||
      t.note.toLowerCase().includes(q) ||
      t.totalAmount.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.customerEmail.toLowerCase().includes(q) ||
      t.dateTime.toLowerCase().includes(q) ||
      t.bucket.toLowerCase().includes(q)
    );
  });

  const getSidebarUnitLabel = (unit: string) => compactUnitLabel[unit] ?? unit;

  return (
    <>
      <aside
        className="h-full w-[19rem] shrink-0 border-l bg-card xl:w-[21rem] 2xl:w-[23rem] flex flex-col overflow-hidden"
        style={{ paddingRight: "max(0.75rem, var(--safe-area-right))" }}
      >
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
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3 pr-4 space-y-2">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onSelect(ticket)}
                className={`group relative rounded-md border px-3 py-3 cursor-pointer transition-colors text-xs ${
                  ticket.id === selectedId
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot[ticket.status]}`} />
                      <span className="font-semibold text-foreground truncate">#{ticket.jobNumber}</span>
                    </div>
                    <p className="text-muted-foreground truncate mt-0.5">
                      {ticket.customer || "No customer"}
                      {ticket.jobName && ticket.jobName !== "Job" && (
                        <span className="text-muted-foreground/70 ml-1">· PO: {ticket.jobName}</span>
                      )}
                    </p>
                  </div>
                  <div className="mr-1 shrink-0 text-right min-w-[5.5rem]">
                    <div className="whitespace-nowrap">
                      <span className="font-bold text-foreground tabular-nums">{ticket.totalAmount}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">{getSidebarUnitLabel(ticket.totalUnit)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground truncate">{ticket.product}</span>
                    <div className="mr-1 flex shrink-0 items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                     {ticket.status !== "completed" && onStatusChange && (
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-5 w-5 text-success hover:text-success"
                         onClick={(e) => { e.stopPropagation(); onStatusChange(ticket, "completed"); }}
                         title="Mark Completed"
                       >
                         <CheckCircle2 className="h-3 w-3" />
                       </Button>
                     )}
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-5 w-5"
                       onClick={(e) => { e.stopPropagation(); onPrint(ticket); }}
                       title="Print"
                     >
                       <Printer className="h-3 w-3" />
                     </Button>
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-5 w-5"
                       onClick={(e) => { e.stopPropagation(); setEmailTicket(ticket); }}
                       title="Email"
                     >
                       <Mail className="h-3 w-3" />
                     </Button>
                     {!readOnly && (
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-5 w-5 text-destructive"
                         onClick={(e) => { e.stopPropagation(); setDeleteId(ticket.id); }}
                       >
                         <Trash2 className="h-3 w-3" />
                       </Button>
                     )}
                   </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">No tickets found.</p>
            )}
          </div>
        </div>
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

      <AlertDialog open={!!emailTicket} onOpenChange={(open) => !open && setEmailTicket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send email?</AlertDialogTitle>
            <AlertDialogDescription>
              {emailTicket?.customerEmail
                ? `This will send the ticket to ${emailTicket.customerEmail}. Continue?`
                : "No customer email is set for this ticket. Please add one in the editor first."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {emailTicket?.customerEmail && (
              <AlertDialogAction
                onClick={() => {
                  if (emailTicket) {
                    onEmail(emailTicket);
                    setEmailTicket(null);
                  }
                }}
              >
                Send
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
