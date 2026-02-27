import { ReportEmailConfig } from "@/types/template";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface Props {
  config: ReportEmailConfig;
  onChange: (config: ReportEmailConfig) => void;
}

export function ReportEmailConfigEditor({ config, onChange }: Props) {
  const toggle = (key: keyof ReportEmailConfig) => {
    onChange({ ...config, [key]: !config[key] });
  };

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Report Email Sections</h2>

      <div className="space-y-2">
        {[
          { key: "showSummaryCards" as const, label: "Summary Cards (Tickets / Tons / Yards)" },
          { key: "showCustomerBreakdown" as const, label: "By Customer Breakdown" },
          { key: "showProductBreakdown" as const, label: "By Product Breakdown" },
          { key: "showTicketDetails" as const, label: "Ticket Details Table" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
            <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
            <Switch checked={config[key] as boolean} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-foreground mt-6 mb-3">Colors</h2>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Header</Label>
          <Input
            type="color"
            value={config.headerColor}
            onChange={(e) => onChange({ ...config, headerColor: e.target.value })}
            className="w-10 h-8 p-0.5 cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Accent</Label>
          <Input
            type="color"
            value={config.accentColor}
            onChange={(e) => onChange({ ...config, accentColor: e.target.value })}
            className="w-10 h-8 p-0.5 cursor-pointer"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="mt-6 rounded-lg border bg-white p-4 text-xs text-black space-y-3" style={{ maxWidth: 400 }}>
        <div className="font-bold text-sm" style={{ color: config.headerColor }}>Company Name – Report</div>
        <div className="text-gray-500 text-[11px]">This Week: 02/20/2026 – 02/27/2026</div>

        {config.showSummaryCards && (
          <div className="flex gap-2">
            {["12 Tickets", "45.2 Tons", "18.5 Yards"].map((v) => (
              <div key={v} className="flex-1 text-center py-2 rounded" style={{ background: config.accentColor }}>
                <div className="font-bold text-sm">{v.split(" ")[0]}</div>
                <div className="text-[10px] text-gray-500">{v.split(" ")[1]}</div>
              </div>
            ))}
          </div>
        )}

        {config.showCustomerBreakdown && (
          <div>
            <div className="font-semibold text-[11px] mb-1">By Customer</div>
            <div className="rounded text-[10px]" style={{ background: config.accentColor }}>
              <div className="flex justify-between px-2 py-1 border-b border-gray-200"><span>Pink Cleaning</span><span>3 | 8.2T</span></div>
              <div className="flex justify-between px-2 py-1"><span>ABC Landscaping</span><span>5 | 12.1T</span></div>
            </div>
          </div>
        )}

        {config.showProductBreakdown && (
          <div>
            <div className="font-semibold text-[11px] mb-1">By Product</div>
            <div className="rounded text-[10px]" style={{ background: config.accentColor }}>
              <div className="flex justify-between px-2 py-1"><span>Eco-Blast Salt</span><span>7 | 22.5T</span></div>
            </div>
          </div>
        )}

        {config.showTicketDetails && (
          <div>
            <div className="font-semibold text-[11px] mb-1">Ticket Details</div>
            <div className="text-[10px] text-gray-400">Job# | Date | Customer | Product | Amount...</div>
          </div>
        )}
      </div>
    </div>
  );
}
