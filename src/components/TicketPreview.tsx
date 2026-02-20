import { TicketData } from "@/types/ticket";
import { TemplateField, DEFAULT_TEMPLATE_FIELDS } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";
import { toast } from "sonner";
import companyLogo from "@/assets/Greenhillssupply_logo.png";

interface TicketPreviewProps {
  ticket: TicketData;
  templateFields?: TemplateField[];
  copiesPerPage?: number;
}

export function TicketPreview({ ticket, templateFields, copiesPerPage = 2 }: TicketPreviewProps) {
  const fields = templateFields || DEFAULT_TEMPLATE_FIELDS;
  const visible = (key: string) => fields.find((f) => f.id === key)?.visible ?? true;

  // Group visible fields by section in template order
  const headerFields = fields.filter((f) => f.section === "header" && f.visible);
  const productFields = fields.filter((f) => f.section === "product" && f.visible);
  const footerFields = fields.filter((f) => f.section === "footer" && f.visible);

  const getFieldValue = (key: string): string => {
    return (ticket as any)[key] || "—";
  };

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

      {/* Ticket copies */}
      {Array.from({ length: copiesPerPage }, (_, i) => i).map((copy) => (
        <div key={copy} className={`max-w-4xl mx-auto bg-white border-2 border-foreground/80 text-foreground font-sans text-sm print:border print:shadow-none ${copy < copiesPerPage - 1 ? "mb-6" : ""}`}>
        {/* Top section: Company info left, Ticket No right */}
        <div className="flex justify-between items-start p-4 pb-2">
          <div className="flex items-start gap-3">
            <img src={companyLogo} alt={ticket.companyName} className="h-12 w-auto" />
            <div>
              <h2 className="text-base font-bold">{ticket.companyName}</h2>
              <p className="text-xs text-foreground/70">{ticket.companyWebsite}</p>
              <p className="text-xs text-foreground/70">{ticket.companyEmail}</p>
              <p className="text-xs text-foreground/70">{ticket.companyPhone}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Ticket No:</p>
            <p className="text-2xl font-bold tracking-tight">{ticket.jobNumber}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-foreground/30 mx-4" />

        {/* Header details (dynamic) */}
        {headerFields.length > 0 && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 px-4 py-2">
            {headerFields.map((f) => (
              <FieldRow key={f.id} label={f.label} value={getFieldValue(f.key)} />
            ))}
          </div>
        )}

        {/* Product + Total row */}
        {productFields.length > 0 && (
          <>
            <div className="mx-4 border-t border-foreground/30" />
            <div className="px-4 py-2">
              <div className="flex items-baseline justify-between">
                <div className="flex gap-8">
                  {visible("product") && <FieldRow label="Product" value={ticket.product} />}
                </div>
                {(visible("totalAmount") || visible("totalUnit")) && (
                  <div className="text-right">
                    {visible("totalAmount") && (
                      <span className="text-xl font-bold">{ticket.totalAmount}</span>
                    )}
                    {visible("totalUnit") && (
                      <span className="text-sm font-medium ml-2">{ticket.totalUnit}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer details (dynamic) */}
        {footerFields.length > 0 && (
          <>
            <div className="mx-4 border-t border-foreground/30" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 px-4 py-2">
              {footerFields
                .filter((f) => f.id !== "customerName")
                .map((f) => (
                  <FieldRow key={f.id} label={f.label} value={getFieldValue(f.key)} />
                ))}
            </div>
          </>
        )}

        {/* Sign-off (if customerName visible) */}
        {visible("customerName") && (
          <>
            <div className="mx-4 border-t border-foreground/30" />
            <div className="px-4 py-2 pb-3">
              <div className="flex gap-2 items-end">
                <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">Received&nbsp;:</span>
                <div className="flex-1 border-b border-foreground/40 min-h-[20px] pb-0.5">
                  <span className="text-sm">{ticket.customerName}</span>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      ))}
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
