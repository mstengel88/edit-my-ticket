import { useState, useRef, useCallback } from "react";
import { PrintLayouts, PrintLayoutConfig, DEFAULT_PRINT_LAYOUTS } from "@/types/template";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PrintLayoutDesignerProps {
  printLayouts: PrintLayouts;
  onChange: (layouts: PrintLayouts) => void;
}

// Letter page in inches
const PAGE_W = 8.5;
const PAGE_H = 11;
const PREVIEW_SCALE = 60; // px per inch for the visual preview

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function InchInput({
  label,
  value,
  onChange,
  min = 0,
  max = 4,
  step = 0.05,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground whitespace-nowrap w-28">{label}</Label>
      <Input
        type="number"
        className="w-24 h-8 text-xs bg-card"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
      />
      <span className="text-xs text-muted-foreground">in</span>
    </div>
  );
}

function PagePreview({
  config,
  copyCount,
  onTicketDrag,
}: {
  config: PrintLayoutConfig;
  copyCount: number;
  onTicketDrag: (index: number, dx: number, dy: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<{ index: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const pw = PAGE_W * PREVIEW_SCALE;
  const ph = PAGE_H * PREVIEW_SCALE;
  const ml = config.pageMarginLeft * PREVIEW_SCALE;
  const mr = config.pageMarginRight * PREVIEW_SCALE;
  const mt = config.pageMarginTop * PREVIEW_SCALE;
  const mb = config.pageMarginBottom * PREVIEW_SCALE;

  const contentW = pw - ml - mr;
  const contentH = ph - mt - mb;
  const ticketH = contentH / copyCount;

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      const offset = config.ticketOffsets[index] || { x: 0, y: 0 };
      dragState.current = { index, startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        const dx = (ev.clientX - dragState.current.startX) / PREVIEW_SCALE;
        const dy = (ev.clientY - dragState.current.startY) / PREVIEW_SCALE;
        onTicketDrag(
          dragState.current.index,
          Math.round((dragState.current.origX + dx) * 20) / 20,
          Math.round((dragState.current.origY + dy) * 20) / 20
        );
      };

      const handleMouseUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [config.ticketOffsets, onTicketDrag]
  );

  return (
    <div className="border rounded-lg bg-muted p-4 flex justify-center">
      <svg
        ref={svgRef}
        width={pw}
        height={ph}
        className="bg-white border border-border shadow-sm"
        style={{ maxWidth: "100%" }}
      >
        {/* Page margins guide */}
        <rect
          x={ml}
          y={mt}
          width={contentW}
          height={contentH}
          fill="none"
          stroke="hsl(220 13% 88%)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {/* Tickets */}
        {Array.from({ length: copyCount }).map((_, i) => {
          const offset = config.ticketOffsets[i] || { x: 0, y: 0 };
          const tx = ml + offset.x * PREVIEW_SCALE;
          const ty = mt + i * ticketH + offset.y * PREVIEW_SCALE;

          return (
            <g key={i}>
              <rect
                x={tx}
                y={ty}
                width={contentW}
                height={ticketH - 4}
                rx={4}
                fill="hsl(174 60% 96%)"
                stroke="hsl(174 60% 40%)"
                strokeWidth={1.5}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleMouseDown(i, e)}
              />
              <text
                x={tx + contentW / 2}
                y={ty + ticketH / 2 - 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none"
                fontSize={12}
                fill="hsl(174 60% 25%)"
                fontWeight={600}
              >
                Ticket {i + 1}
              </text>
              <text
                x={tx + contentW / 2}
                y={ty + ticketH / 2 + 14}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none"
                fontSize={9}
                fill="hsl(220 10% 46%)"
              >
                offset: {offset.x.toFixed(2)}" × {offset.y.toFixed(2)}"
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PrintLayoutDesigner({ printLayouts, onChange }: PrintLayoutDesignerProps) {
  const [activeTab, setActiveTab] = useState<"1" | "2" | "3">("3");

  const config = printLayouts[activeTab];

  const updateConfig = useCallback(
    (partial: Partial<PrintLayoutConfig>) => {
      onChange({
        ...printLayouts,
        [activeTab]: { ...config, ...partial },
      });
    },
    [printLayouts, activeTab, config, onChange]
  );

  const updateOffset = useCallback(
    (index: number, x: number, y: number) => {
      const offsets = [...config.ticketOffsets];
      offsets[index] = { x, y };
      updateConfig({ ticketOffsets: offsets });
    },
    [config.ticketOffsets, updateConfig]
  );

  const copyCount = Number(activeTab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Print Layout Designer</h2>
        <p className="text-xs text-muted-foreground">
          Configure page margins and drag tickets to position them. Each layout (1, 2, or 3 per page) is saved independently.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "1" | "2" | "3")}>
        <TabsList>
          <TabsTrigger value="1">1 per page</TabsTrigger>
          <TabsTrigger value="2">2 per page</TabsTrigger>
          <TabsTrigger value="3">3 per page</TabsTrigger>
        </TabsList>

        {(["1", "2", "3"] as const).map((key) => (
          <TabsContent key={key} value={key}>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Visual preview */}
              <PagePreview
                config={printLayouts[key]}
                copyCount={Number(key)}
                onTicketDrag={updateOffset}
              />

              {/* Numeric controls */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Page Margins</h3>
                  <div className="space-y-2">
                    <InchInput label="Top" value={config.pageMarginTop} onChange={(v) => updateConfig({ pageMarginTop: v })} />
                    <InchInput label="Bottom" value={config.pageMarginBottom} onChange={(v) => updateConfig({ pageMarginBottom: v })} />
                    <InchInput label="Left" value={config.pageMarginLeft} onChange={(v) => updateConfig({ pageMarginLeft: v })} />
                    <InchInput label="Right" value={config.pageMarginRight} onChange={(v) => updateConfig({ pageMarginRight: v })} />
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Ticket Offsets</h3>
                  <div className="space-y-3">
                    {config.ticketOffsets.map((offset, i) => (
                      <div key={i} className="space-y-1">
                        <span className="text-xs font-medium text-accent-foreground">Ticket {i + 1}</span>
                        <div className="space-y-1.5 pl-2">
                          <InchInput
                            label="Horizontal (X)"
                            value={offset.x}
                            onChange={(v) => updateOffset(i, v, offset.y)}
                            min={-3}
                            max={3}
                          />
                          <InchInput
                            label="Vertical (Y)"
                            value={offset.y}
                            onChange={(v) => updateOffset(i, offset.x, v)}
                            min={-3}
                            max={3}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
