import { TicketData } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";
import { toast } from "sonner";

interface TicketPreviewProps {
  ticket: TicketData;
}

function DottedLine() {
  return (
    <div className="border-b border-dashed border-foreground/30 my-2" />
  );
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

      {/* Receipt-style ticket */}
      <div className="max-w-md mx-auto bg-card border border-ticket-border ticket-shadow rounded-sm font-mono text-sm">
        <div className="p-6 space-y-0">
          {/* Dotted top border */}
          <DottedLine />

          {/* Company Header */}
          <div className="text-center space-y-0.5 py-1">
            <h2 className="text-lg font-bold text-foreground">{ticket.companyName}</h2>
            <p className="text-xs text-muted-foreground">{ticket.companyEmail}</p>
            <p className="text-xs text-muted-foreground">{ticket.companyWebsite}</p>
            <p className="text-xs text-muted-foreground">{ticket.companyPhone}</p>
          </div>

          <DottedLine />

          {/* Job Info */}
          <div className="py-1 space-y-0.5">
            <p className="text-foreground">Job Number {ticket.jobNumber}</p>
          </div>

          <DottedLine />

          <div className="py-1 space-y-0.5">
            <p className="text-foreground">Job: {ticket.jobName}</p>
            <p className="text-muted-foreground text-xs">{ticket.dateTime}</p>
          </div>

          {/* Total - emphasized */}
          <div className="py-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              Total {ticket.totalAmount} {ticket.totalUnit}
            </p>
          </div>

          <DottedLine />

          {/* Details */}
          <div className="py-2 space-y-1">
            <ReceiptRow label="Customer" value={ticket.customer} />
            <ReceiptRow label="Product" value={ticket.product} />
            <ReceiptRow label="Truck" value={ticket.truck} />
            <ReceiptRow label="Note" value={ticket.note || "—"} />
          </div>

          <DottedLine />

          <div className="py-1">
            <p className="text-foreground text-center">{ticket.bucket}</p>
          </div>

          <DottedLine />

          {/* Sign-off area */}
          <div className="py-3 space-y-4">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Name:</p>
              <div className="border-b border-foreground/20 min-h-[24px]">
                <span className="text-foreground">{ticket.customerName}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Address:</p>
              <div className="border-b border-foreground/20 min-h-[24px]">
                <span className="text-foreground">{ticket.customerAddress}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Signature:</p>
              <div className="border-b border-foreground/20 min-h-[32px]">
                {ticket.signature && <span className="text-foreground italic">{ticket.signature}</span>}
              </div>
            </div>
          </div>

          <DottedLine />

          {/* Footer timestamp */}
          <div className="py-1 text-center">
            <p className="text-xs text-muted-foreground">{ticket.dateTime}</p>
          </div>

          <DottedLine />
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>
      <br />
      <span className="text-foreground ml-2">{value}</span>
    </div>
  );
}
