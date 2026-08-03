import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComboInput } from "@/components/ComboInput";
import { useTicketLookups } from "@/hooks/useTicketLookups";
import { getAccessToken } from "@/lib/getAccessToken";
import { getSavedLoadriteGatewayUrl } from "@/lib/loadriteGatewaySettings";
import { TicketData } from "@/types/ticket";

interface GatewayDispatchForm {
  truck: string;
  product: string;
  quantity: string;
  poNumber: string;
  zone: string;
  location: string;
  priority: string;
}

interface GatewayLookups {
  trucks: string[];
  products: string[];
  warnings?: string[];
}

interface LoadriteGatewayDispatchFormProps {
  ticket?: TicketData | null;
  compact?: boolean;
}

const DEFAULT_FORM: GatewayDispatchForm = {
  truck: "",
  product: "",
  quantity: "",
  poNumber: "",
  zone: "Ticket Creator",
  location: "",
  priority: "0",
};

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formFromTicket(ticket?: TicketData | null): GatewayDispatchForm {
  if (!ticket) return DEFAULT_FORM;
  return {
    truck: ticket.truck || "",
    product: ticket.product || "",
    quantity: ticket.totalAmount || "",
    poNumber: ticket.jobName || ticket.jobNumber || "",
    zone: "Ticket Creator",
    location: ticket.customerAddress || "",
    priority: "0",
  };
}

export function LoadriteGatewayDispatchForm({ ticket, compact = false }: LoadriteGatewayDispatchFormProps) {
  const { products, trucks } = useTicketLookups();
  const [form, setForm] = useState<GatewayDispatchForm>(() => formFromTicket(ticket));
  const [gatewayLookups, setGatewayLookups] = useState<GatewayLookups>({ trucks: [], products: [] });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    setForm(formFromTicket(ticket));
    setResult("");
  }, [ticket]);

  useEffect(() => {
    let cancelled = false;

    const loadGatewayLookups = async () => {
      setLookupLoading(true);
      try {
        const token = await getAccessToken();
        const gatewayUrl = await getSavedLoadriteGatewayUrl();
        const params = new URLSearchParams({ gatewayUrl });
        const response = await fetch(`/api/lci-lookups?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const text = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (!response.ok || data?.ok === false) {
          throw new Error(data?.error || text || "Could not load gateway lookups.");
        }

        if (!cancelled) {
          setGatewayLookups({
            trucks: Array.isArray(data?.trucks) ? data.trucks : [],
            products: Array.isArray(data?.products) ? data.products : [],
            warnings: Array.isArray(data?.warnings) ? data.warnings : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Gateway lookups unavailable:", error);
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    };

    void loadGatewayLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  const truckOptions = useMemo(
    () => uniqueSorted([...trucks, ...gatewayLookups.trucks]),
    [gatewayLookups.trucks, trucks],
  );

  const productOptions = useMemo(
    () => uniqueSorted([...products, ...gatewayLookups.products]),
    [gatewayLookups.products, products],
  );

  const update = <K extends keyof GatewayDispatchForm>(key: K, value: GatewayDispatchForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult("");
  };

  const getReadableError = (text: string, data: any) => {
    if (data?.error) return String(data.error);
    if (text.includes("<title>405 Not Allowed</title>") || text.includes("<h1>405 Not Allowed</h1>")) {
      return "Gateway endpoint rejected this action with 405 Not Allowed.";
    }
    return text || "Gateway dispatch failed.";
  };

  const handleSend = async () => {
    const quantity = Number.parseFloat(form.quantity);

    if (!form.truck.trim()) {
      toast.error("Truck is required.");
      return;
    }

    if (!form.product.trim()) {
      toast.error("Product is required.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }

    setSending(true);
    setResult("");

    try {
      const token = await getAccessToken();
      const gatewayUrl = await getSavedLoadriteGatewayUrl();
      const response = await fetch("/api/lci-dispatch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          truck: form.truck.trim(),
          product: form.product.trim(),
          quantity,
          poNumber: form.poNumber.trim(),
          zone: form.zone.trim() || "Ticket Creator",
          location: form.location.trim(),
          priority: Number.parseInt(form.priority || "0", 10) || 0,
          gatewayUrl,
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok || data?.ok === false) {
        throw new Error(getReadableError(text, data));
      }

      setResult(JSON.stringify(data.payload ?? data.result ?? data, null, 2));
      toast.success("Sent to Loadrite gateway.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gateway dispatch failed.";
      setResult(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const inputClassName =
    "border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/40";

  return (
    <section className="rounded-[26px] border border-cyan-300/20 bg-[#111c2d] p-4 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-3 border-b border-cyan-300/15 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
          <Truck className="h-4 w-4" />
          Gateway Dispatch
        </p>
        <Button onClick={() => void handleSend()} disabled={sending} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to Gateway
        </Button>
      </div>

      <div className={`mt-3 grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor="gateway-ticket-truck">Truck</Label>
          <ComboInput
            value={form.truck}
            onChange={(value) => update("truck", value)}
            options={truckOptions}
            placeholder={lookupLoading ? "Loading trucks..." : "Select or type truck"}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway-ticket-product">Product</Label>
          <ComboInput
            value={form.product}
            onChange={(value) => update("product", value)}
            options={productOptions}
            placeholder={lookupLoading ? "Loading products..." : "Select or type product"}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway-ticket-quantity">Quantity</Label>
          <Input
            id="gateway-ticket-quantity"
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => update("quantity", event.target.value)}
            placeholder="4"
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway-ticket-po">PO / Job Number</Label>
          <Input
            id="gateway-ticket-po"
            value={form.poNumber}
            onChange={(event) => update("poNumber", event.target.value)}
            placeholder="201-10378"
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway-ticket-zone">Zone</Label>
          <Input
            id="gateway-ticket-zone"
            value={form.zone}
            onChange={(event) => update("zone", event.target.value)}
            placeholder="Ticket Creator"
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway-ticket-location">Location</Label>
          <Input
            id="gateway-ticket-location"
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Optional"
            className={inputClassName}
          />
        </div>
      </div>

      {gatewayLookups.warnings?.length ? (
        <p className="mt-3 text-xs text-amber-200">
          Gateway lookup warning: using saved Ticket Creator lists where Loadrite did not return a list.
        </p>
      ) : null}

      {result && (
        <pre className="mt-4 max-h-52 overflow-auto rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-300">
          {result}
        </pre>
      )}
    </section>
  );
}
