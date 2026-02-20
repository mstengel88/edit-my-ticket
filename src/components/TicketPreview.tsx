import { TicketData } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";
import { toast } from "sonner";
import companyLogo from "@/assets/Greenhillssupply_logo.png";

interface TicketPreviewProps {
  ticket: TicketData;
}

export function TicketPreview({ ticket }: TicketPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Ticket - Job #${ticket.jobNumber} from ${ticket.companyName}`);
    const body = encodeURIComponent(
      `Job #${ticket.jobNumber}\nCustomer: ${ticket.customer}\nProduct: ${ticket.product}\nTotal: ${ticket.totalAmount} ${ticket.totalUnit}\n\nThank you,\n${ticket.companyName}`
    );
    const to = ticket.customerEmail || "";
    window.open(`mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`);
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

      {/* Modern slim ticket */}
      <div className="max-w-md mx-auto bg-card text-card-foreground font-sans text-sm rounded-xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">
        {/* Header bar */}
        <div className="bg-primary px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={companyLogo} alt={ticket.companyName} className="h-8 w-auto brightness-0 invert" />
            <span className="text-primary-foreground font-semibold text-sm">{ticket.companyName}</span>
          </div>
          <span className="text-primary-foreground/80 text-xs font-mono">#{ticket.jobNumber}</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Date */}
          <p className="text-xs text-muted-foreground">{ticket.dateTime}</p>

          {/* Customer */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Customer</p>
            <p className="font-semibold">{ticket.customer}</p>
            {ticket.customerEmail && (
              <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
            )}
          </div>

          {/* Job */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Job</p>
            <p className="font-semibold">{ticket.jobName}</p>
          </div>

          {/* Product + Weight highlight */}
          <div className="bg-accent/50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Product</p>
              <p className="font-semibold">{ticket.product}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-accent-foreground leading-none">{ticket.totalAmount}</p>
              <p className="text-xs text-muted-foreground">{ticket.totalUnit}</p>
            </div>
          </div>

          {/* Details row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Truck</p>
              <p className="text-sm font-medium">{ticket.truck}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Bucket</p>
              <p className="text-sm font-medium">{ticket.bucket}</p>
            </div>
          </div>

          {/* Note */}
          {ticket.note && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Note</p>
              <p className="text-sm">{ticket.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span>Received by </span>
            <span className="font-medium text-foreground">{ticket.customerName || "—"}</span>
          </div>
          <div className="text-xs text-muted-foreground">{ticket.companyPhone}</div>
        </div>
      </div>
    </div>
  );
}

