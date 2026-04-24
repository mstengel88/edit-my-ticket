import { useState } from "react";
import { TicketData } from "@/types/ticket";
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
  const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length;
  const draftCount = tickets.filter((ticket) => ticket.status === "draft").length;
  const completedCount = tickets.filter((ticket) => ticket.status === "completed").length;

  return (
    <>
      <aside
        className="h-full w-[19rem] shrink-0 border-l border-white/8 bg-[#111c2d] xl:w-[21rem] 2xl:w-[23rem] flex flex-col overflow-hidden"
        style={{ paddingRight: "max(0.75rem, var(--safe-area-right))" }}
      >
        {/* Header */}
        <div className="space-y-3 border-b border-white/8 px-3 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Live Queue</p>
              <h3 className="mt-1 text-base font-semibold text-white">Tickets</h3>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">{tickets.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Draft", value: draftCount },
              { label: "Pending", value: pendingCount },
              { label: "Done", value: completedCount },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 border-white/10 bg-[#0d1726] text-xs text-white">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="z-50 border-white/10 bg-[#132135] text-slate-100">
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
              className="h-9 border-white/10 bg-[#0d1726] pl-8 text-xs text-white placeholder:text-slate-500"
            />
          </div>
          {!readOnly && (
            <Button onClick={onNew} size="sm" className="h-9 w-full gap-1.5 bg-cyan-400 text-xs text-slate-950 hover:bg-cyan-300">
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
                className={`group relative rounded-2xl border px-3 py-3 cursor-pointer transition-colors text-xs ${
                  ticket.id === selectedId
                    ? "border-cyan-300/20 bg-cyan-400/8"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {ticket.status}
                  </span>
                  <span className="text-[10px] text-slate-500">{ticket.dateTime}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot[ticket.status]}`} />
                      <span className="font-semibold text-white truncate">#{ticket.jobNumber}</span>
                    </div>
                    <p className="mt-0.5 truncate text-slate-300">
                      {ticket.customer || "No customer"}
                      {ticket.jobName && ticket.jobName !== "Job" && (
                        <span className="ml-1 text-slate-500">· PO: {ticket.jobName}</span>
                      )}
                    </p>
                  </div>
                  <div className="mr-1 shrink-0 text-right min-w-[5.5rem]">
                    <div className="whitespace-nowrap">
                      <span className="font-bold text-white tabular-nums">{ticket.totalAmount}</span>
                      <span className="ml-1 text-[10px] text-cyan-300">{getSidebarUnitLabel(ticket.totalUnit)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-slate-500">{ticket.product}</span>
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
                       className="h-5 w-5 text-slate-300 hover:bg-white/5 hover:text-white"
                       onClick={(e) => { e.stopPropagation(); onPrint(ticket); }}
                       title="Print"
                     >
                       <Printer className="h-3 w-3" />
                     </Button>
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-5 w-5 text-slate-300 hover:bg-white/5 hover:text-white"
                       onClick={(e) => { e.stopPropagation(); setEmailTicket(ticket); }}
                       title="Email"
                     >
                       <Mail className="h-3 w-3" />
                     </Button>
                     {!readOnly && (
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-5 w-5 text-rose-300 hover:bg-rose-400/10"
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
              <p className="py-6 text-center text-xs text-slate-500">No tickets found.</p>
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
