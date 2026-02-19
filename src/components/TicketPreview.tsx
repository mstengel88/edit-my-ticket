import { TicketData } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";
import { toast } from "sonner";

interface TicketPreviewProps {
  ticket: TicketData;
}

export function TicketPreview({ ticket }: TicketPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Ticket ${ticket.ticketNumber} from ${ticket.companyName}`);
    const body = encodeURIComponent(
      `Hi ${ticket.customerName},\n\nPlease find your ticket ${ticket.ticketNumber} for $${ticket.total.toFixed(2)}.\n\nThank you,\n${ticket.companyName}`
    );
    window.open(`mailto:${ticket.customerEmail}?subject=${subject}&body=${body}`);
    toast.success("Email client opened!");
  };

  return (
    <div className="animate-fade-in">
      {/* Actions */}
      <div className="flex justify-center gap-3 mb-6 no-print">
        <Button onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print Ticket
        </Button>
        <Button variant="outline" onClick={handleEmail} className="gap-1.5">
          <Mail className="h-4 w-4" /> Email Ticket
        </Button>
      </div>

      {/* Ticket */}
      <div className="max-w-2xl mx-auto bg-ticket rounded-lg border border-ticket-border ticket-shadow overflow-hidden">
        {/* Header */}
        <div className="bg-ticket-header px-6 py-5 text-ticket-header-foreground">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{ticket.companyName}</h2>
              <p className="text-sm opacity-90 whitespace-pre-line mt-1">{ticket.companyAddress}</p>
              <p className="text-sm opacity-90">{ticket.companyPhone}</p>
              <p className="text-sm opacity-90">{ticket.companyEmail}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold tracking-tight">TICKET</span>
              <p className="text-sm font-medium mt-1">{ticket.ticketNumber}</p>
            </div>
          </div>
        </div>

        {/* Meta & Customer */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-ticket-border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill To</span>
            <p className="font-semibold text-foreground mt-1">{ticket.customerName}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{ticket.customerAddress}</p>
            <p className="text-sm text-muted-foreground">{ticket.customerPhone}</p>
            <p className="text-sm text-muted-foreground">{ticket.customerEmail}</p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
              <p className="text-sm text-foreground">{ticket.date}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</span>
              <p className="text-sm text-foreground">{ticket.dueDate}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
              <p className="text-sm font-medium text-foreground capitalize">{ticket.status}</p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ticket-border text-left">
                <th className="py-2 font-semibold text-foreground">Description</th>
                <th className="py-2 font-semibold text-foreground text-center w-16">Qty</th>
                <th className="py-2 font-semibold text-foreground text-right w-24">Price</th>
                <th className="py-2 font-semibold text-foreground text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {ticket.lineItems.map((item, i) => (
                <tr
                  key={item.id}
                  className={i % 2 === 0 ? "bg-ticket-stripe" : ""}
                >
                  <td className="py-2 px-1 text-foreground">{item.description}</td>
                  <td className="py-2 text-center text-foreground tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right text-foreground tabular-nums">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium text-foreground tabular-nums">${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 flex justify-end border-t border-ticket-border">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground tabular-nums">${ticket.subtotal.toFixed(2)}</span>
            </div>
            {ticket.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({ticket.taxRate}%)</span>
                <span className="text-foreground tabular-nums">${ticket.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {ticket.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-foreground tabular-nums">-${ticket.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-ticket-border pt-2 text-base font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary tabular-nums">${ticket.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {(ticket.notes || ticket.terms) && (
          <div className="px-6 py-4 border-t border-ticket-border bg-ticket-stripe">
            {ticket.notes && (
              <div className="mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
                <p className="text-sm text-foreground mt-0.5">{ticket.notes}</p>
              </div>
            )}
            {ticket.terms && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terms</span>
                <p className="text-sm text-muted-foreground mt-0.5">{ticket.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
