import { useState, useEffect, useCallback } from "react";
import { TicketData } from "@/types/ticket";
import { CanvasElement, DEFAULT_CANVAS_ELEMENTS, CANVAS_WIDTH, CANVAS_HEIGHT, TemplateField, PrintLayouts, DEFAULT_PRINT_LAYOUTS } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Printer, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import companyLogo from "@/assets/Greenhillssupply_logo.png";
import { supabase } from "@/integrations/supabase/client";
import { canUseNativePrint, printTicketImage as printNativeTicketImage } from "@/lib/nativePrint";

interface TicketPreviewProps {
  ticket: TicketData;
  canvasElements?: CanvasElement[];
  emailElements?: CanvasElement[];
  templateFields?: TemplateField[];
  copiesPerPage?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  printLayouts?: PrintLayouts;
}

export function TicketPreview({ ticket, canvasElements, emailElements, copiesPerPage = 2, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT, printLayouts }: TicketPreviewProps) {
  const elements = canvasElements || DEFAULT_CANVAS_ELEMENTS;
  const [sending, setSending] = useState(false);

  const layouts = printLayouts || DEFAULT_PRINT_LAYOUTS;

  const renderTicketToImage = useCallback(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to create print canvas");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.textBaseline = "top";

    const getValue = (key: string): string => {
      return (ticket as any)[key] || "—";
    };

    const logoImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load company logo"));
      image.src = companyLogo;
    });

    for (const el of elements) {
      if (el.type === "logo") {
        ctx.drawImage(logoImage, el.x, el.y, el.width, el.height);
        continue;
      }

      if (el.type === "divider") {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        const y = el.y + el.height / 2;
        ctx.beginPath();
        ctx.moveTo(el.x, y);
        ctx.lineTo(el.x + el.width, y);
        ctx.stroke();
        continue;
      }

      const align = el.textAlign || "left";
      const value = el.type === "label" ? (el.content || el.label) : getValue(el.key || "");
      const prefix = el.type === "field" && el.showLabel ? `${el.label}: ` : "";
      const text = `${prefix}${value}`;
      const x = align === "right" ? el.x + el.width : align === "center" ? el.x + el.width / 2 : el.x;

      ctx.font = `${el.fontWeight === "bold" ? "700" : "400"} ${el.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.textAlign = align;
      ctx.fillText(text, x, el.y);
    }

    return canvas.toDataURL("image/png");
  }, [canvasHeight, canvasWidth, elements, ticket]);

  const handlePrint = useCallback(() => {
    const nativePrint = canUseNativePrint();
    const printDpi = 96;

    // Get layout config for current copies count
    const layoutKey = String(copiesPerPage) as "1" | "2" | "3";
    const config = layouts[layoutKey] || layouts["3"];

    renderTicketToImage()
      .then(async (imageDataUrl) => {
        if (nativePrint) {
          await printNativeTicketImage({
            imageDataUrl,
            jobName: ticket.jobNumber,
            copiesPerPage,
            pageMarginTop: config.pageMarginTop,
            pageMarginRight: config.pageMarginRight,
            pageMarginBottom: config.pageMarginBottom,
            pageMarginLeft: config.pageMarginLeft,
            ticketOffsets: config.ticketOffsets,
            ticketSizes: config.ticketSizes,
          });
          return;
        }

        const printableWidthPx = (8.5 - config.pageMarginLeft - config.pageMarginRight) * printDpi;
        const printableHeightPx = (11 - config.pageMarginTop - config.pageMarginBottom) * printDpi;
        const copiesHtml: string[] = [];
        let accumulatedTopPx = 0;
        for (let i = 0; i < copiesPerPage; i++) {
          const offset = config.ticketOffsets[i] || { x: 0, y: 0 };
          const defaultW = 8.5 - config.pageMarginLeft - config.pageMarginRight;
          const defaultH = (11 - config.pageMarginTop - config.pageMarginBottom) / copiesPerPage;
          const size = config.ticketSizes?.[i] || { width: defaultW, height: defaultH };

          const ticketWidthPx = size.width * printDpi;
          const ticketHeightPx = size.height * printDpi;
          copiesHtml.push(`
            <div
              class="ticket-copy"
              style="
                width:${ticketWidthPx}px;
                height:${ticketHeightPx}px;
                left:${offset.x * printDpi}px;
                top:${accumulatedTopPx + offset.y * printDpi}px;
              "
            >
              <img src="${imageDataUrl}" alt="Ticket ${ticket.jobNumber}" />
            </div>
          `);
          accumulatedTopPx += ticketHeightPx;
        }

        const existingFrame = document.getElementById("ticket-print-frame");
        if (existingFrame) existingFrame.remove();

        const printFrame = document.createElement("iframe");
        printFrame.id = "ticket-print-frame";
        printFrame.setAttribute("aria-hidden", "true");
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "0";
        printFrame.style.opacity = "0";
        document.body.appendChild(printFrame);

        const frameWindow = printFrame.contentWindow;
        const frameDocument = printFrame.contentDocument;
        if (!frameWindow || !frameDocument) {
          printFrame.remove();
          throw new Error("Unable to start Safari print preview");
        }

        const html = `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Print Ticket ${ticket.jobNumber}</title>
              <style>
                @page {
                  margin: ${config.pageMarginTop}in ${config.pageMarginRight}in ${config.pageMarginBottom}in ${config.pageMarginLeft}in;
                  size: letter portrait;
                }

                html, body {
                  margin: 0;
                  padding: 0;
                  background: #fff;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }

                body {
                  display: flex;
                  justify-content: center;
                }

                .print-sheet {
                  position: relative;
                  width: ${printableWidthPx}px;
                  height: ${printableHeightPx}px;
                  overflow: hidden;
                  background: #fff;
                }

                .ticket-copy {
                  position: absolute;
                  overflow: hidden;
                }

                .ticket-copy img {
                  display: block;
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                }
              </style>
            </head>
            <body>
              <div class="print-sheet">
                ${copiesHtml.join("")}
              </div>
              <script>
                const images = Array.from(document.images);
                Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                }))).then(() => {
                  setTimeout(() => {
                    window.focus();
                    window.print();
                  }, 150);
                });
              </script>
            </body>
          </html>`;

        frameDocument.open();
        frameDocument.write(html);
        frameDocument.close();

        frameWindow.addEventListener(
          "afterprint",
          () => {
            window.setTimeout(() => {
              printFrame.remove();
            }, 250);
          },
          { once: true }
        );
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Printing failed";
        toast.error(message);
      });
  }, [copiesPerPage, layouts, renderTicketToImage, ticket.jobNumber]);

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
    <div className="animate-fade-in">
      <div className="flex justify-center gap-3 mb-6">
        <Button onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print Ticket
        </Button>
      </div>

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
