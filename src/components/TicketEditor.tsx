import { useState, useEffect } from "react";
import { TicketData } from "@/types/ticket";
import { TemplateField, DEFAULT_TEMPLATE_FIELDS } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, Mail, Save, Truck, UserRound, Package2, ClipboardList, Building2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ComboInput } from "@/components/ComboInput";
import { useTicketLookups } from "@/hooks/useTicketLookups";

interface TicketEditorProps {
  ticket: TicketData;
  onSave: (ticket: TicketData) => void;
  onPrint: (ticket: TicketData) => void;
  onEmail: (ticket: TicketData) => void;
  templateFields?: TemplateField[];
}

export function TicketEditor({ ticket, onSave, onPrint, onEmail, templateFields }: TicketEditorProps) {
  const [data, setData] = useState<TicketData>(ticket);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const { products, customers, customerEmails, trucks } = useTicketLookups();
  const fields = templateFields || DEFAULT_TEMPLATE_FIELDS;
  // customerEmail is always editable in the editor even if hidden from preview
  const ALWAYS_VISIBLE_IN_EDITOR = ["customerEmail"];
  const visible = (key: string) =>
    ALWAYS_VISIBLE_IN_EDITOR.includes(key) || (fields.find((f) => f.id === key)?.visible ?? true);

  useEffect(() => {
    setData(ticket);
  }, [ticket]);

  const updateField = <K extends keyof TicketData>(key: K, value: TicketData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.select();
  };

  const handleSave = () => {
    const updated = { ...data, status: "pending" as TicketData["status"] };
    setData(updated);
    onSave(updated);
    toast.success("Ticket saved!");
  };

  const FieldShell = ({
    label,
    children,
    emphasis,
  }: {
    label: string;
    children: React.ReactNode;
    emphasis?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${emphasis ? "text-cyan-300" : "text-slate-500"}`}>
        {label}
      </Label>
      {children}
    </div>
  );

  const inputClassName =
    "border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/40";

  const selectClassName =
    "flex h-11 w-full rounded-xl border border-white/10 bg-[#0d1726] px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40";

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in">
      <div className="rounded-[28px] border border-white/8 bg-[#111c2d] p-5 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-200 hover:bg-cyan-400/10">
              Ticket Workbench
            </Badge>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Ticket {data.jobNumber}</h2>
              <p className="text-sm text-slate-400">Review dispatch details, update the load, then print or email from the same workspace.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onPrint(data)} className="gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Printer className="h-4 w-4" /> Print
          </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEmailConfirm(true)} className="gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Mail className="h-4 w-4" /> Email
          </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <Save className="h-4 w-4" /> Save
          </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_1.35fr_0.85fr]">
          <section className="rounded-[24px] border border-white/8 bg-[#0f1827] p-4">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Load Snapshot</h3>
            </div>
            <div className="grid gap-4">
              <FieldShell label="Job Number">
                <Input value={data.jobNumber} onChange={(e) => updateField("jobNumber", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
              </FieldShell>
              {visible("jobName") && (
                <FieldShell label="PO Number">
                  <Input value={data.jobName} onChange={(e) => updateField("jobName", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
                </FieldShell>
              )}
              {visible("dateTime") && (
                <FieldShell label="Date / Time">
                  <Input value={data.dateTime} onChange={(e) => updateField("dateTime", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
                </FieldShell>
              )}
              {visible("truck") && (
                <FieldShell label="Truck">
                  <ComboInput value={data.truck} onChange={(v) => updateField("truck", v)} options={trucks} placeholder="Assign truck" />
                </FieldShell>
              )}
              {visible("bucket") && (
                <FieldShell label="Bucket / Bucket Notes">
                  <Input value={data.bucket} onChange={(e) => updateField("bucket", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
                </FieldShell>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-[#0f1827] p-4">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Customer & Material</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {visible("customer") && (
                <FieldShell label="Customer">
                  <ComboInput value={data.customer} onChange={(v) => {
                    updateField("customer", v);
                    const email = customerEmails[v];
                    if (email) updateField("customerEmail", email);
                  }} options={customers} placeholder="Select or type customer" />
                </FieldShell>
              )}
              {visible("product") && (
                <FieldShell label="Product">
                  <ComboInput value={data.product} onChange={(v) => updateField("product", v)} options={products} placeholder="Select or type product" />
                </FieldShell>
              )}
              {visible("customerEmail") && (
                <FieldShell label="Customer Email">
                  <Input type="email" value={data.customerEmail} onChange={(e) => updateField("customerEmail", e.target.value)} onFocus={selectOnFocus} placeholder="customer@example.com" className={inputClassName} />
                </FieldShell>
              )}
              {visible("customerName") && (
                <FieldShell label="Contact Name">
                  <Input value={data.customerName} onChange={(e) => updateField("customerName", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
                </FieldShell>
              )}
              {visible("customerAddress") && (
                <div className="md:col-span-2">
                  <FieldShell label="Job Address">
                    <Textarea rows={3} value={data.customerAddress} onChange={(e) => updateField("customerAddress", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
                  </FieldShell>
                </div>
              )}
              {visible("note") && (
                <div className="md:col-span-2">
                  <FieldShell label="Ticket Note">
                    <Textarea rows={4} value={data.note} onChange={(e) => updateField("note", e.target.value)} onFocus={selectOnFocus} className={inputClassName} />
                  </FieldShell>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-[#0f1827] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Package2 className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Dispatch Total</h3>
            </div>

            <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Current Load</p>
              <div className="mt-3 flex items-end gap-3">
                {visible("totalAmount") && (
                  <Input
                    value={data.totalAmount}
                    onChange={(e) => updateField("totalAmount", e.target.value)}
                    onFocus={selectOnFocus}
                    className="h-16 border-none bg-transparent px-0 text-5xl font-semibold tracking-tight text-white shadow-none focus-visible:ring-0"
                  />
                )}
                {visible("totalUnit") && (
                  <select
                    value={data.totalUnit}
                    onChange={(e) => updateField("totalUnit", e.target.value)}
                    className="mb-1 rounded-xl border border-white/10 bg-[#0d1726] px-3 py-2 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                  >
                    <option value="Ton">Ton</option>
                    <option value="Yardage">Yardage</option>
                    <option value="Gallons">Gallons</option>
                  </select>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-white">Truck & Status</p>
                </div>
                <div className="mt-4 grid gap-4">
                  <FieldShell label="Status" emphasis>
                    <select
                      value={data.status}
                      onChange={(e) => updateField("status", e.target.value as TicketData["status"])}
                      className={selectClassName}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="completed">Completed</option>
                    </select>
                  </FieldShell>
                  <FieldShell label="Current Truck">
                    <div className="rounded-xl border border-white/8 bg-[#0d1726] px-3 py-3 text-sm text-slate-300">
                      {data.truck || "No truck assigned"}
                    </div>
                  </FieldShell>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-white">Company Reference</p>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Company</p>
                    <p className="mt-1">{data.companyName}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Email</p>
                      <p className="mt-1 break-all">{data.companyEmail}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Phone</p>
                      <p className="mt-1">{data.companyPhone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Website</p>
                    <p className="mt-1">{data.companyWebsite}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send email?</AlertDialogTitle>
            <AlertDialogDescription>
              {data.customerEmail
                ? `This will send the ticket to ${data.customerEmail}. Continue?`
                : "No customer email is set for this ticket. Please add one first."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {data.customerEmail && (
              <AlertDialogAction onClick={() => { onEmail(data); setShowEmailConfirm(false); }}>
                Send
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
