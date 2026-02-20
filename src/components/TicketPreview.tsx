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

      {/* Professional ticket layout */}
      <div className="max-w-3xl mx-auto bg-white border-2 border-foreground/80 text-foreground font-sans text-sm print:border print:shadow-none">
        {/* Top section: Company info left, Ticket No right */}
        <div className="flex justify-between items-start p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold">{ticket.companyName}</h2>
            <p className="text-xs text-foreground/70">{ticket.companyWebsite}</p>
            <p className="text-xs text-foreground/70">{ticket.companyEmail}</p>
            <p className="text-xs text-foreground/70">{ticket.companyPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Ticket No:</p>
            <p className="text-3xl font-bold tracking-tight">{ticket.jobNumber}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-foreground/30 mx-4" />

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 p-6 py-4">
          <FieldRow label="Date" value={ticket.dateTime} />
          <div />
          <FieldRow label="Job" value={ticket.jobName} />
          <div />
          <FieldRow label="Customer" value={ticket.customer} />
          <FieldRow label="Customer Email" value={ticket.customerEmail || "—"} />
        </div>

        {/* Product + Total row */}
        <div className="mx-4 border-t border-foreground/30" />
        <div className="p-6 py-4">
          <div className="flex items-baseline justify-between">
            <div className="flex gap-8">
              <FieldRow label="Product" value={ticket.product} />
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{ticket.totalAmount}</span>
              <span className="text-base font-medium ml-2">{ticket.totalUnit}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-foreground/30" />

        {/* Bottom details */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 p-6 py-4">
          <FieldRow label="Truck" value={ticket.truck} />
          <FieldRow label="Bucket" value={ticket.bucket} />
          <FieldRow label="Note" value={ticket.note || "—"} />
          <div />
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-foreground/30" />

        {/* Sign-off */}
        <div className="p-6 py-4 space-y-3">
          <div className="flex gap-2 items-end">
            <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">Received&nbsp;:</span>
            <div className="flex-1 border-b border-foreground/40 min-h-[24px] pb-0.5">
              <span className="text-sm">{ticket.customerName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 items-baseline">
      <span className="text-xs font-medium text-foreground/70 whitespace-nowrap min-w-[100px]">{label}&nbsp;:</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
