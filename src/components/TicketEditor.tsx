import { useState, useEffect } from "react";
import { TicketData, LineItem } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TicketEditorProps {
  ticket: TicketData;
  onSave: (ticket: TicketData) => void;
  onPreview: (ticket: TicketData) => void;
}

export function TicketEditor({ ticket, onSave, onPreview }: TicketEditorProps) {
  const [data, setData] = useState<TicketData>(ticket);

  useEffect(() => {
    setData(ticket);
  }, [ticket]);

  const recalculate = (items: LineItem[], taxRate: number, discount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, total };
  };

  const updateField = <K extends keyof TicketData>(key: K, value: TicketData[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "taxRate" || key === "discount") {
        const calc = recalculate(next.lineItems, next.taxRate, next.discount);
        return { ...next, ...calc };
      }
      return next;
    });
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setData((prev) => {
      const items = prev.lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      });
      const calc = recalculate(items, prev.taxRate, prev.discount);
      return { ...prev, lineItems: items, ...calc };
    });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setData((prev) => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
  };

  const removeLineItem = (id: string) => {
    setData((prev) => {
      const items = prev.lineItems.filter((i) => i.id !== id);
      const calc = recalculate(items, prev.taxRate, prev.discount);
      return { ...prev, lineItems: items, ...calc };
    });
  };

  const handleSave = () => {
    onSave(data);
    toast.success("Ticket saved successfully!");
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
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

      {/* Ticket Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div>
          <Label className="text-xs text-muted-foreground">Ticket #</Label>
          <Input value={data.ticketNumber} onChange={(e) => updateField("ticketNumber", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input type="date" value={data.date} onChange={(e) => updateField("date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Due Date</Label>
          <Input type="date" value={data.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            value={data.status}
            onChange={(e) => updateField("status", e.target.value as TicketData["status"])}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Company & Customer */}
      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Your Company</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={data.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Textarea rows={2} value={data.companyAddress} onChange={(e) => updateField("companyAddress", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input value={data.companyPhone} onChange={(e) => updateField("companyPhone", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={data.companyEmail} onChange={(e) => updateField("companyEmail", e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Customer</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={data.customerName} onChange={(e) => updateField("customerName", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Textarea rows={2} value={data.customerAddress} onChange={(e) => updateField("customerAddress", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input value={data.customerPhone} onChange={(e) => updateField("customerPhone", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={data.customerEmail} onChange={(e) => updateField("customerEmail", e.target.value)} />
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Line Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
          <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1.5">
            <Plus className="h-3 w-3" /> Add Item
          </Button>
        </div>
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Total</span>
            <span />
          </div>
          {data.lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_100px_32px] gap-2 rounded-md border bg-card p-2 sm:p-1 sm:border-0 sm:bg-transparent">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
              />
              <Input
                type="number"
                min={0}
                value={item.quantity}
                onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.unitPrice}
                onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
              />
              <Input
                readOnly
                value={`$${item.total.toFixed(2)}`}
                className="bg-muted"
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-9 w-9"
                onClick={() => removeLineItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-full sm:w-72 space-y-2 rounded-lg border bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground tabular-nums">${data.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Tax (%)</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={data.taxRate}
              onChange={(e) => updateField("taxRate", parseFloat(e.target.value) || 0)}
              className="w-20 h-7 text-right"
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax Amount</span>
            <span className="text-foreground tabular-nums">${data.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Discount ($)</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={data.discount}
              onChange={(e) => updateField("discount", parseFloat(e.target.value) || 0)}
              className="w-20 h-7 text-right"
            />
          </div>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-primary tabular-nums">${data.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea rows={3} value={data.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Any notes for the customer..." />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
          <Textarea rows={3} value={data.terms} onChange={(e) => updateField("terms", e.target.value)} placeholder="Payment terms..." />
        </div>
      </div>
    </div>
  );
}
