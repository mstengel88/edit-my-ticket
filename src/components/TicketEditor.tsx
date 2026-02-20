import { useState, useEffect } from "react";
import { TicketData } from "@/types/ticket";
import { TemplateField, DEFAULT_TEMPLATE_FIELDS } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { ComboInput } from "@/components/ComboInput";
import { useTicketLookups } from "@/hooks/useTicketLookups";

interface TicketEditorProps {
  ticket: TicketData;
  onSave: (ticket: TicketData) => void;
  onPreview: (ticket: TicketData) => void;
  templateFields?: TemplateField[];
}

export function TicketEditor({ ticket, onSave, onPreview, templateFields }: TicketEditorProps) {
  const [data, setData] = useState<TicketData>(ticket);
  const { products, customers, customerEmails, trucks } = useTicketLookups();
  const fields = templateFields || DEFAULT_TEMPLATE_FIELDS;
  const visible = (key: string) => fields.find((f) => f.id === key)?.visible ?? true;

  useEffect(() => {
    setData(ticket);
  }, [ticket]);

  const updateField = <K extends keyof TicketData>(key: K, value: TicketData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(data);
    toast.success("Ticket saved!");
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Edit Ticket</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPreview(data)} className="gap-1.5">
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Company Info</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Company Name</Label>
            <Input value={data.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input value={data.companyPhone} onChange={(e) => updateField("companyPhone", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={data.companyEmail} onChange={(e) => updateField("companyEmail", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Website</Label>
            <Input value={data.companyWebsite} onChange={(e) => updateField("companyWebsite", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Job Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Job Number</Label>
            <Input value={data.jobNumber} onChange={(e) => updateField("jobNumber", e.target.value)} />
          </div>
          {visible("jobName") && (
            <div>
              <Label className="text-xs text-muted-foreground">Job Name</Label>
              <Input value={data.jobName} onChange={(e) => updateField("jobName", e.target.value)} />
            </div>
          )}
          {visible("dateTime") && (
            <div>
              <Label className="text-xs text-muted-foreground">Date/Time</Label>
              <Input value={data.dateTime} onChange={(e) => updateField("dateTime", e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Total */}
      {(visible("totalAmount") || visible("totalUnit")) && (
        <div className="rounded-lg border bg-card p-4 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Total</h3>
          <div className="grid grid-cols-2 gap-3">
            {visible("totalAmount") && (
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input
                  value={data.totalAmount}
                  onChange={(e) => updateField("totalAmount", e.target.value)}
                  className="text-2xl font-bold h-12"
                />
              </div>
            )}
            {visible("totalUnit") && (
              <div>
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <select
                  value={data.totalUnit}
                  onChange={(e) => updateField("totalUnit", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Ton">Ton</option>
                  <option value="Yardage">Yardage</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Details */}
      <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Ticket Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {visible("customer") && (
            <div>
              <Label className="text-xs text-muted-foreground">Customer</Label>
              <ComboInput value={data.customer} onChange={(v) => {
                updateField("customer", v);
                const email = customerEmails[v];
                if (email) updateField("customerEmail", email);
              }} options={customers} placeholder="Select or type customer" />
            </div>
          )}
          {visible("customerEmail") && (
            <div>
              <Label className="text-xs text-muted-foreground">Customer Email</Label>
              <Input type="email" value={data.customerEmail} onChange={(e) => updateField("customerEmail", e.target.value)} placeholder="customer@example.com" />
            </div>
          )}
          {visible("product") && (
            <div>
              <Label className="text-xs text-muted-foreground">Product</Label>
              <ComboInput value={data.product} onChange={(v) => updateField("product", v)} options={products} placeholder="Select or type product" />
            </div>
          )}
          {visible("truck") && (
            <div>
              <Label className="text-xs text-muted-foreground">Truck</Label>
              <ComboInput value={data.truck} onChange={(v) => updateField("truck", v)} options={trucks} placeholder="Select or type truck" />
            </div>
          )}
          {visible("bucket") && (
            <div>
              <Label className="text-xs text-muted-foreground">Bucket</Label>
              <Input value={data.bucket} onChange={(e) => updateField("bucket", e.target.value)} />
            </div>
          )}
        </div>
        {visible("note") && (
          <div>
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Textarea rows={2} value={data.note} onChange={(e) => updateField("note", e.target.value)} />
          </div>
        )}
      </div>

      {/* Customer Sign-off */}
      {(visible("customerName") || visible("customerAddress") || visible("signature")) && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Customer Sign-off</h3>
          {visible("customerName") && (
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={data.customerName} onChange={(e) => updateField("customerName", e.target.value)} />
            </div>
          )}
          {visible("customerAddress") && (
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Textarea rows={2} value={data.customerAddress} onChange={(e) => updateField("customerAddress", e.target.value)} />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <select
              value={data.status}
              onChange={(e) => updateField("status", e.target.value as TicketData["status"])}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
