import { useState, useEffect, useRef, useCallback } from "react";
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
  templateFields?: TemplateField[];
  copiesPerPage?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function TicketPreview({ ticket, canvasElements, emailElements, copiesPerPage = 2, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT }: TicketPreviewProps) {
  const elements = canvasElements || DEFAULT_CANVAS_ELEMENTS;
  const [sending, setSending] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    // Create a dedicated print container outside the React root
    const existing = document.getElementById("print-area");
    if (existing) existing.remove();

    const printArea = document.createElement("div");
    printArea.id = "print-area";

    // Calculate scale: page is ~7.6in wide (letter minus margins), at 96dpi = ~730px
    const pageWidth = 730;
    const pageHeight = 1000; // usable height in px (letter minus margins)
    const ticketHeight = pageHeight / (copiesPerPage || 3);
    const scale = Math.min(pageWidth / canvasWidth, ticketHeight / canvasHeight);

    for (let i = 0; i < copiesPerPage; i++) {
      const copy = document.createElement("div");
      copy.className = "ticket-copy";
      copy.style.height = `${ticketHeight}px`;
      if (i > 0) copy.style.marginTop = "24px"; // ~0.25in spacing

      const inner = document.createElement("div");
      inner.className = "ticket-copy-inner";
      inner.style.position = "relative";
      inner.style.width = `${canvasWidth}px`;
      inner.style.height = `${canvasHeight}px`;
      inner.style.transform = `scale(${scale})`;
      inner.style.transformOrigin = "top left";

      // Clone the ticket content from the first on-screen copy
      if (printRef.current) {
        const source = printRef.current.querySelector(".ticket-copy-inner");
        if (source) {
          inner.innerHTML = source.innerHTML;
        }
      }

      copy.appendChild(inner);
      printArea.appendChild(copy);
    }

    document.body.appendChild(printArea);

    // Wait for all images to load before printing
    const images = printArea.querySelectorAll("img");
    const imagePromises = Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    );

    Promise.all(imagePromises).then(() => {
      window.print();
      setTimeout(() => {
        const el = document.getElementById("print-area");
        if (el) el.remove();
      }, 1000);
    });
  }, [copiesPerPage, canvasWidth, canvasHeight]);

  useEffect(() => {
    const onPrintRequest = () => handlePrint();
    window.addEventListener("ticket-print-request", onPrintRequest);
    return () => window.removeEventListener("ticket-print-request", onPrintRequest);
  }, [handlePrint]);

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
    <div className="animate-fade-in" ref={printRef}>
      {/* Actions */}
      <div className="flex justify-center gap-3 mb-6">
        <Button onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print Ticket
        </Button>
        <Button variant="outline" onClick={handleEmail} className="gap-1.5" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {sending ? "Sending…" : "Email Ticket"}
        </Button>
      </div>

      {/* On-screen preview (single copy for reference) */}
      <div
        className="ticket-copy max-w-4xl mx-auto bg-white text-black font-sans text-sm relative border border-border"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <div className="ticket-copy-inner relative w-full h-full" style={{ width: canvasWidth, height: canvasHeight }}>
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
      </div>
    </div>
  );
}
