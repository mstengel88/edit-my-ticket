import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTicketLookups } from "@/hooks/useTicketLookups";
import { TicketData, createEmptyTicket, formatTicketDateTime } from "@/types/ticket";
import { ComboInput } from "@/components/ComboInput";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Package2,
  Plus,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  customer: string;
  customer_email: string;
  product: string;
  po_number: string;
  job_address: string;
  total_amount: number;
  total_unit: string;
  ticket_count: number;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface OrderFormState {
  customer: string;
  customerEmail: string;
  product: string;
  poNumber: string;
  jobAddress: string;
  totalAmount: string;
  totalUnit: string;
  ticketCount: string;
  notes: string;
}

interface OrderSummary extends OrderRow {
  tickets: TicketData[];
  draftCount: number;
  pendingCount: number;
  completedCount: number;
  issuedCount: number;
  issuedAmount: number;
  latestActivity: Date | null;
}

const defaultOrderForm: OrderFormState = {
  customer: "",
  customerEmail: "",
  product: "",
  poNumber: "",
  jobAddress: "",
  totalAmount: "",
  totalUnit: "Yardage",
  ticketCount: "1",
  notes: "",
};

function parseTicketDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapTicketRow(row: any): TicketData {
  return {
    id: row.id,
    jobNumber: row.job_number,
    jobName: row.job_name,
    dateTime: row.date_time,
    orderId: row.order_id,
    orderSequence: row.order_sequence,
    issuedAt: row.issued_at,
    companyName: row.company_name,
    companyEmail: row.company_email,
    companyWebsite: row.company_website,
    companyPhone: row.company_phone,
    totalAmount: row.total_amount,
    totalUnit: row.total_unit,
    customer: row.customer,
    product: row.product,
    truck: row.truck,
    note: row.note,
    bucket: row.bucket,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAddress: row.customer_address,
    signature: row.signature,
    status: row.status as TicketData["status"],
  };
}

async function getNextMtJobNumbers(count: number) {
  let nextNumber = 1;

  const { data: rows } = await supabase
    .from("tickets")
    .select("job_number")
    .like("job_number", "MT-%")
    .order("job_number", { ascending: false })
    .limit(1);

  if (rows && rows.length > 0) {
    const match = rows[0].job_number.match(/^MT-(\d+)$/);
    if (match) nextNumber = Number.parseInt(match[1], 10) + 1;
  }

  return Array.from({ length: count }, (_, index) => `MT-${String(nextNumber + index).padStart(6, "0")}`);
}

const Orders = () => {
  const { session } = useAuth();
  const { customers, customerEmails, products } = useTicketLookups();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderTickets, setOrderTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<OrderFormState>(defaultOrderForm);

  const loadOrders = useCallback(async () => {
    if (!session?.user?.id) {
      setOrders([]);
      setOrderTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: orderRows, error: orderError }, { data: ticketRows, error: ticketError }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase
        .from("tickets")
        .select("*")
        .not("order_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);

    if (orderError || ticketError) {
      toast.error("Failed to load orders");
      setOrders([]);
      setOrderTickets([]);
      setLoading(false);
      return;
    }

    setOrders((orderRows as OrderRow[]) ?? []);
    setOrderTickets(((ticketRows as any[]) ?? []).map(mapTicketRow));
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const summaries = useMemo<OrderSummary[]>(() => {
    return orders.map((order) => {
      const tickets = orderTickets.filter((ticket) => ticket.orderId === order.id);
      const draftCount = tickets.filter((ticket) => ticket.status === "draft").length;
      const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length;
      const completedCount = tickets.filter((ticket) => ticket.status === "completed").length;
      const issuedTickets = tickets.filter((ticket) => Boolean(ticket.issuedAt));
      const issuedAmount = issuedTickets.reduce(
        (sum, ticket) => sum + (Number.parseFloat(ticket.totalAmount) || 0),
        0,
      );
      const latestActivity = tickets
        .map((ticket) => parseTicketDate(ticket.dateTime))
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      return {
        ...order,
        tickets,
        draftCount,
        pendingCount,
        completedCount,
        issuedCount: issuedTickets.length,
        issuedAmount,
        latestActivity,
      };
    });
  }, [orders, orderTickets]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return summaries.filter((order) => {
      const derivedStatus =
        order.completedCount >= order.ticket_count
          ? "completed"
          : order.issuedCount > 0
            ? "active"
            : "draft";

      if (customerFilter !== "all" && order.customer !== customerFilter) return false;
      if (productFilter !== "all" && order.product !== productFilter) return false;
      if (statusFilter !== "all" && derivedStatus !== statusFilter) return false;

      if (!query) return true;

      return (
        order.customer.toLowerCase().includes(query) ||
        order.product.toLowerCase().includes(query) ||
        order.po_number.toLowerCase().includes(query) ||
        order.job_address.toLowerCase().includes(query) ||
        order.tickets.some((ticket) => ticket.jobNumber.toLowerCase().includes(query))
      );
    });
  }, [customerFilter, productFilter, search, statusFilter, summaries]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    if (!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) ?? null;

  const summary = useMemo(() => {
    const totalRequested = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const totalIssued = filteredOrders.reduce((sum, order) => sum + order.issuedAmount, 0);
    const totalDrafts = filteredOrders.reduce((sum, order) => sum + order.draftCount, 0);

    return {
      orders: filteredOrders.length,
      customers: new Set(filteredOrders.map((order) => order.customer)).size,
      requested: totalRequested.toFixed(2),
      issued: totalIssued.toFixed(2),
      drafts: totalDrafts,
    };
  }, [filteredOrders]);

  const handleCustomerChange = (value: string) => {
    setForm((current) => ({
      ...current,
      customer: value,
      customerEmail: customerEmails[value] ?? current.customerEmail,
    }));
  };

  const handleCreateOrder = async () => {
    const userId = session?.user?.id;
    const ticketCount = Number.parseInt(form.ticketCount, 10);
    const totalAmount = Number.parseFloat(form.totalAmount);

    if (!userId) return;
    if (!form.customer.trim()) return toast.error("Customer is required");
    if (!form.product.trim()) return toast.error("Product is required");
    if (!ticketCount || ticketCount < 1) return toast.error("Ticket count must be at least 1");
    if (Number.isNaN(totalAmount) || totalAmount <= 0) return toast.error("Total ordered amount is required");

    setSaving(true);

    const orderInsert = {
      user_id: userId,
      customer: form.customer.trim(),
      customer_email: form.customerEmail.trim(),
      product: form.product.trim(),
      po_number: form.poNumber.trim(),
      job_address: form.jobAddress.trim(),
      total_amount: totalAmount,
      total_unit: form.totalUnit,
      ticket_count: ticketCount,
      notes: form.notes.trim(),
      status: "open",
    };

    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert(orderInsert)
      .select("*")
      .single();

    if (orderError || !createdOrder) {
      toast.error("Failed to create order");
      setSaving(false);
      return;
    }

    const jobNumbers = await getNextMtJobNumbers(ticketCount);
    const baseTicket = createEmptyTicket();
    const draftRows = jobNumbers.map((jobNumber, index) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      job_number: jobNumber,
      job_name: form.poNumber.trim(),
      date_time: formatTicketDateTime(),
      order_id: createdOrder.id,
      order_sequence: index + 1,
      issued_at: null,
      company_name: baseTicket.companyName,
      company_email: baseTicket.companyEmail,
      company_website: baseTicket.companyWebsite,
      company_phone: baseTicket.companyPhone,
      total_amount: "0.00",
      total_unit: form.totalUnit,
      customer: form.customer.trim(),
      product: form.product.trim(),
      truck: "",
      note: form.notes.trim(),
      bucket: "",
      customer_name: "",
      customer_email: form.customerEmail.trim(),
      customer_address: form.jobAddress.trim(),
      signature: "",
      status: "draft",
    }));

    const { error: ticketError } = await supabase.from("tickets").insert(draftRows);
    if (ticketError) {
      await supabase.from("orders").delete().eq("id", createdOrder.id);
      toast.error("Failed to create draft tickets for the order");
      setSaving(false);
      return;
    }

    toast.success(`Order created with ${ticketCount} draft ticket${ticketCount === 1 ? "" : "s"}`);
    setDialogOpen(false);
    setForm(defaultOrderForm);
    await loadOrders();
    setSelectedOrderId(createdOrder.id);
    setSaving(false);
  };

  return (
    <AppLayout title="Orders" subtitle="Create customer orders and pre-build draft tickets for later issue">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_1.25fr]">
          <section className="console-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="console-eyebrow">Order Desk</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Pre-build order tickets before the trucks ever hit the yard.
                </h2>
                <p className="console-copy mt-3 max-w-2xl">
                  Create an order for a customer, generate draft tickets ahead of time, and then issue each ticket as the
                  load happens. Order-linked tickets stamp their real load date and time the first time they are saved out
                  of draft.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <Plus className="h-4 w-4" />
                New Order
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {[
                { label: "Orders", value: summary.orders, icon: ClipboardList },
                { label: "Customers", value: summary.customers, icon: Users },
                { label: "Requested", value: summary.requested, icon: Package2 },
                { label: "Issued", value: summary.issued, icon: Truck },
                { label: "Draft Tickets", value: summary.drafts, icon: FileText },
              ].map((item) => (
                <div key={item.label} className="console-kpi">
                  <div className="flex items-center justify-between">
                    <p className="console-eyebrow">{item.label}</p>
                    <item.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="console-panel p-6">
            <p className="console-eyebrow">Filters</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Query open and issued orders</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, PO, product, address, or ticket..."
                  className="h-11 border-white/10 bg-[#0d1726] pl-9 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer</p>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="h-11 border-white/10 bg-[#0d1726] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#132135] text-slate-100">
                    <SelectItem value="all">All customers</SelectItem>
                    {Array.from(new Set(summaries.map((order) => order.customer))).sort().map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product</p>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="h-11 border-white/10 bg-[#0d1726] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#132135] text-slate-100">
                    <SelectItem value="all">All products</SelectItem>
                    {Array.from(new Set(summaries.map((order) => order.product))).sort().map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Order State</p>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border-white/10 bg-[#0d1726] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#132135] text-slate-100">
                    <SelectItem value="all">All states</SelectItem>
                    <SelectItem value="draft">Draft only</SelectItem>
                    <SelectItem value="active">Issued / active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="console-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="console-eyebrow">Order List</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Saved customer orders</h3>
              </div>
              <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                {filteredOrders.length} shown
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-400">
                  No orders match the current query.
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const statusTone =
                    order.completedCount >= order.ticket_count
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                      : order.issuedCount > 0
                        ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
                        : "border-slate-300/20 bg-slate-400/10 text-slate-200";

                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`block w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                        order.id === selectedOrderId
                          ? "border-cyan-300/20 bg-cyan-400/8"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{order.customer}</p>
                            <Badge className={`border ${statusTone}`}>{order.completedCount >= order.ticket_count ? "Completed" : order.issuedCount > 0 ? "Active" : "Draft"}</Badge>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-300">{order.product}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            PO: {order.po_number || "No PO"} · {order.ticket_count} ticket{order.ticket_count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-white">{Number(order.total_amount).toFixed(2)}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{order.total_unit}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="console-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="console-eyebrow">Order Detail</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {selectedOrder ? selectedOrder.customer : "Select an order"}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedOrder ? `${selectedOrder.product} · PO ${selectedOrder.po_number || "No PO"}` : "Choose an order from the left to review its draft and issued tickets."}
                </p>
              </div>
              {selectedOrder && (
                <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                  {selectedOrder.ticket_count} ticket{selectedOrder.ticket_count === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            {!selectedOrder ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">
                Select an order to review the job address, planned quantity, and draft tickets ready to issue.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="console-kpi">
                    <p className="console-eyebrow">Requested</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {Number(selectedOrder.total_amount).toFixed(2)} {selectedOrder.total_unit}
                    </p>
                  </div>
                  <div className="console-kpi">
                    <p className="console-eyebrow">Issued</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {selectedOrder.issuedAmount.toFixed(2)} {selectedOrder.total_unit}
                    </p>
                  </div>
                  <div className="console-kpi">
                    <p className="console-eyebrow">Draft Remaining</p>
                    <p className="mt-2 text-xl font-semibold text-white">{selectedOrder.draftCount}</p>
                  </div>
                  <div className="console-kpi">
                    <p className="console-eyebrow">Last Activity</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedOrder.latestActivity ? format(selectedOrder.latestActivity, "MM/dd/yyyy h:mm a") : "No issue yet"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="console-panel-soft p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-semibold text-white">Job Address</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {selectedOrder.job_address || "No job address saved yet"}
                    </p>
                  </div>
                  <div className="console-panel-soft p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-semibold text-white">Customer Contact</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {selectedOrder.customer_email || "No customer email saved"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-white">Draft and issued tickets</h4>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Open a draft ticket to issue it at load time
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedOrder.tickets
                      .slice()
                      .sort((a, b) => (a.orderSequence ?? 0) - (b.orderSequence ?? 0))
                      .map((ticket) => (
                        <div
                          key={ticket.id}
                          className="console-panel-soft grid gap-3 px-4 py-4 md:grid-cols-[0.9fr_1fr_auto_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">#{ticket.jobNumber}</p>
                              <Badge
                                className={`border ${
                                  ticket.status === "completed"
                                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                                    : ticket.status === "billable"
                                      ? "border-sky-300/20 bg-sky-400/10 text-sky-200"
                                    : ticket.status === "pending"
                                      ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
                                      : "border-slate-300/20 bg-slate-400/10 text-slate-200"
                                }`}
                              >
                                {ticket.status}
                              </Badge>
                              {ticket.orderSequence ? (
                                <Badge className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/5">
                                  Ticket {ticket.orderSequence}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-300">{ticket.product || "No product"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {ticket.issuedAt ? `Issued ${format(new Date(ticket.issuedAt), "MM/dd/yyyy h:mm a")}` : "Not issued yet"}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Truck / Address</p>
                            <p className="mt-1 truncate text-sm text-slate-300">{ticket.truck || "No truck assigned"}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{ticket.customerAddress || "No address"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-white">{ticket.totalAmount}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{ticket.totalUnit}</p>
                          </div>
                          <div className="flex items-center justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                              onClick={() => navigate("/", { state: { openTicketId: ticket.id } })}
                            >
                              {ticket.issuedAt ? "Open" : "Issue"}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#111c2d] text-white">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Customer</Label>
              <ComboInput
                value={form.customer}
                onChange={handleCustomerChange}
                options={customers}
                placeholder="Select or type customer"
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Customer Email</Label>
              <Input
                type="email"
                value={form.customerEmail}
                onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Product</Label>
              <ComboInput
                value={form.product}
                onChange={(value) => setForm((current) => ({ ...current, product: value }))}
                options={products}
                placeholder="Select or type product"
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">PO Number</Label>
              <Input
                value={form.poNumber}
                onChange={(event) => setForm((current) => ({ ...current, poNumber: event.target.value }))}
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
                placeholder="Optional PO"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs text-slate-500">Job Address</Label>
              <AddressAutocompleteInput
                value={form.jobAddress}
                onChange={(value) => setForm((current) => ({ ...current, jobAddress: value }))}
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
                placeholder="Start typing a job address..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Total Ordered Amount</Label>
              <Input
                value={form.totalAmount}
                onChange={(event) => setForm((current) => ({ ...current, totalAmount: event.target.value }))}
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
                placeholder="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Unit</Label>
              <Select value={form.totalUnit} onValueChange={(value) => setForm((current) => ({ ...current, totalUnit: value }))}>
                <SelectTrigger className="border-white/10 bg-[#0d1726] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#132135] text-slate-100">
                  <SelectItem value="Yardage">Yardage</SelectItem>
                  <SelectItem value="Ton">Ton</SelectItem>
                  <SelectItem value="Gallons">Gallons</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Draft Tickets To Create</Label>
              <Input
                value={form.ticketCount}
                onChange={(event) => setForm((current) => ({ ...current, ticketCount: event.target.value }))}
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs text-slate-500">Order Notes</Label>
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
                placeholder="Anything the loader should know about this order..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={saving} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Orders;
