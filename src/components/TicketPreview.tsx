import { useState } from "react";
import { TicketData } from "@/types/ticket";
import { CanvasElement, DEFAULT_CANVAS_ELEMENTS, CANVAS_WIDTH, CANVAS_HEIGHT, TemplateField } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Printer, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import companyLogo from "@/assets/Greenhillssupply_logo.png";
import { supabase } from "@/integrations/supabase/client";

interface TicketPreviewProps {
  ticket: TicketData;
  canvasElements?: CanvasElement[];
  emailElements?: CanvasElement[];
  templateFields?: TemplateField[]; // legacy compat
  copiesPerPage?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function TicketPreview({ ticket, canvasElements, emailElements, copiesPerPage = 2, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT }: TicketPreviewProps) {
  const elements = canvasElements || DEFAULT_CANVAS_ELEMENTS;
  const [sending, setSending] = useState(false);

  const handlePrint = () => window.print();

  const handleEmail = async () => {
    if (!ticket.customerEmail) {
      toast.error("No customer email set. Add one in the editor first.");
      return;
    }
    setSending(true);
    try {
      let logoBase64 = "";
      try {
        const response = await fetch(companyLogo);
        const blob = await response.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("Could not convert logo to base64:", e);
      }

      const { data, error } = await supabase.functions.invoke("send-ticket-email", {
        body: {
          to: ticket.customerEmail,
          subject: `Ticket - Job #${ticket.jobNumber} from ${ticket.companyName}`,
          ticket,
          logoBase64,
          emailElements: emailElements || undefined,
        },
      });
      if (error) throw error;
      toast.success(`Email sent to ${ticket.customerEmail}!`);
    } catch (err: any) {
      console.error("Email send error:", err);
      toast.error(err?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const getValue = (key: string): string => {
    return (ticket as any)[key] || "—";
  };

  const renderElement = (el: CanvasElement) => {
    if (el.type === "logo") {
      return <img src={companyLogo} alt={ticket.companyName} className="h-full w-auto object-contain" />;
    }
    if (el.type === "divider") {
      return <div className="w-full border-t border-black/30" style={{ marginTop: el.height / 2 }} />;
    }
    if (el.type === "label") {
      return (
        <span style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, textAlign: el.textAlign, display: "block", color: "#000" }}>
          {el.content || el.label}
        </span>
      );
    }
    // field type
    const value = getValue(el.key || "");
    return (
      <span style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, textAlign: el.textAlign, display: "block", color: "#000" }}>
        {el.showLabel && (
          <span style={{ fontWeight: "normal", fontSize: Math.max(10, el.fontSize - 2), color: "rgba(0,0,0,0.55)", marginRight: 4 }}>
            {el.label}:
          </span>
        )}
        {value}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Actions */}
      <div className="flex justify-center gap-3 mb-6 no-print">
        <Button onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print Ticket
        </Button>
        <Button variant="outline" onClick={handleEmail} className="gap-1.5" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {sending ? "Sending…" : "Email Ticket"}
        </Button>
      </div>

      {/* Ticket copies */}
      {Array.from({ length: copiesPerPage }, (_, i) => i).map((copy) => (
        <div
          key={copy}
          className={`max-w-4xl mx-auto bg-white text-black border-2 border-black/80 font-sans text-sm print:border print:shadow-none relative ${copy < copiesPerPage - 1 ? "mb-6" : ""}`}
          style={{
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          {elements.map((el) => (
            <div
              key={el.id}
              className="absolute overflow-hidden"
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                textAlign: el.textAlign as any,
              }}
            >
              {renderElement(el)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
