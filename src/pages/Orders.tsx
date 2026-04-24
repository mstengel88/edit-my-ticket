import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { TicketData } from "@/types/ticket";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Package2,
  Search,
  Truck,
  Users,
} from "lucide-react";

interface OrderGroup {
  id: string;
  orderNumber: string;
  customer: string;
  products: string[];
  ticketCount: number;
  truckCount: number;
  totalAmount: number;
  dominantUnit: string;
  latestDate: Date | null;
  statuses: TicketData["status"][];
  tickets: TicketData[];
}

function parseTicketDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function groupTicketsIntoOrders(tickets: TicketData[]): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();

  for (const ticket of tickets) {
    const orderNumber = ticket.jobName?.trim() || "No PO";
    const customer = ticket.customer?.trim() || "Unassigned";
    const key = `${orderNumber}::${customer}`;
    const amount = Number.parseFloat(ticket.totalAmount) || 0;
    const ticketDate = parseTicketDate(ticket.dateTime);

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        orderNumber,
        customer,
        products: [],
        ticketCount: 0,
        truckCount: 0,
        totalAmount: 0,
        dominantUnit: ticket.totalUnit || "Ton",
        latestDate: ticketDate,
        statuses: [],
        tickets: [],
      });
    }

    const group = groups.get(key)!;
    group.ticketCount += 1;
    group.totalAmount += amount;
    group.tickets.push(ticket);
    group.statuses.push(ticket.status);
    if (ticket.product?.trim() && !group.products.includes(ticket.product.trim())) {
      group.products.push(ticket.product.trim());
    }
    if (ticketDate && (!group.latestDate || ticketDate > group.latestDate)) {
      group.latestDate = ticketDate;
    }
  }

  for (const group of groups.values()) {
    group.truckCount = new Set(
      group.tickets.map((ticket) => ticket.truck?.trim()).filter(Boolean),
    ).size;

    const unitCounts = new Map<string, number>();
    for (const ticket of group.tickets) {
      const unit = ticket.totalUnit || "Ton";
      unitCounts.set(unit, (unitCounts.get(unit) ?? 0) + 1);
    }
    group.dominantUnit = Array.from(unitCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Ton";
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.latestDate?.getTime() ?? 0;
    const bTime = b.latestDate?.getTime() ?? 0;
    return bTime - aTime;
  });
}

const Orders = () => {
  const { tickets, loadFromDb } = useLoadriteData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  const orderGroups = useMemo(() => groupTicketsIntoOrders(tickets), [tickets]);

  const customers = useMemo(
    () => Array.from(new Set(orderGroups.map((order) => order.customer))).sort(),
    [orderGroups],
  );

  const products = useMemo(
    () =>
      Array.from(
        new Set(orderGroups.flatMap((order) => order.products)),
      ).sort(),
    [orderGroups],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderGroups.filter((order) => {
      if (customerFilter !== "all" && order.customer !== customerFilter) return false;
      if (productFilter !== "all" && !order.products.includes(productFilter)) return false;
      if (statusFilter !== "all" && !order.statuses.includes(statusFilter as TicketData["status"])) return false;
      if (!query) return true;

      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.products.some((product) => product.toLowerCase().includes(query)) ||
        order.tickets.some((ticket) => ticket.jobNumber.toLowerCase().includes(query))
      );
    });
  }, [customerFilter, orderGroups, productFilter, search, statusFilter]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
    const totalTickets = filteredOrders.reduce((sum, order) => sum + order.ticketCount, 0);
    const totalVolume = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    return {
      orders: filteredOrders.length,
      tickets: totalTickets,
      customers: new Set(filteredOrders.map((order) => order.customer)).size,
      volume: totalVolume.toFixed(2),
    };
  }, [filteredOrders]);

  return (
    <AppLayout title="Orders" subtitle="Group tickets into reusable order views without pricing data">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_1.25fr]">
          <section className="console-panel p-6">
            <p className="console-eyebrow">Order Workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              View ticket groups like orders so dispatch can work faster.
            </h2>
            <p className="console-copy mt-3 max-w-2xl">
              This screen rolls tickets into order-style groups based on PO number and customer. It gives you a cleaner
              way to review related tickets, products, trucks, and load history without bringing pricing into the flow.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Orders", value: summary.orders, icon: ClipboardList },
                { label: "Tickets", value: summary.tickets, icon: FileText },
                { label: "Customers", value: summary.customers, icon: Users },
                { label: "Volume", value: summary.volume, icon: Package2 },
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
            <h3 className="mt-2 text-xl font-semibold text-white">Query the order groups</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order number, customer, product, or ticket..."
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
                    {customers.map((customer) => (
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
                    {products.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border-white/10 bg-[#0d1726] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#132135] text-slate-100">
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
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
                <h3 className="mt-2 text-xl font-semibold text-white">Grouped orders</h3>
              </div>
              <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                {filteredOrders.length} shown
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {filteredOrders.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-400">
                  No orders match the current query.
                </div>
              )}
              {filteredOrders.map((order) => (
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
                      <p className="text-sm font-semibold text-white">{order.orderNumber}</p>
                      <p className="mt-1 truncate text-sm text-slate-300">{order.customer}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {order.products.slice(0, 2).join(" · ") || "No product"}{order.products.length > 2 ? ` +${order.products.length - 2}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">{order.totalAmount.toFixed(2)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{order.dominantUnit}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{order.ticketCount} tickets</span>
                    <span>•</span>
                    <span>{order.truckCount} trucks</span>
                    <span>•</span>
                    <span>{order.latestDate ? format(order.latestDate, "MM/dd/yyyy h:mm a") : "No date"}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="console-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="console-eyebrow">Order Detail</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {selectedOrder ? selectedOrder.orderNumber : "Select an order"}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedOrder ? selectedOrder.customer : "Choose an order group from the left to inspect its tickets."}
                </p>
              </div>
              {selectedOrder && (
                <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                  {selectedOrder.ticketCount} tickets
                </Badge>
              )}
            </div>

            {!selectedOrder ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">
                Select an order to review its tickets, trucks, and material flow.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="console-kpi">
                    <p className="console-eyebrow">Products</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{selectedOrder.products.join(", ") || "No products"}</p>
                  </div>
                  <div className="console-kpi">
                    <p className="console-eyebrow">Trucks</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{selectedOrder.truckCount}</p>
                  </div>
                  <div className="console-kpi">
                    <p className="console-eyebrow">Last Activity</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedOrder.latestDate ? format(selectedOrder.latestDate, "MM/dd/yyyy h:mm a") : "No date"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-white">Associated tickets</h4>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open any ticket in the desk</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedOrder.tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="console-panel-soft grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1fr_auto_auto]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">#{ticket.jobNumber}</p>
                          <p className="mt-1 text-sm text-slate-300">{ticket.product || "No product"}</p>
                          <p className="mt-1 text-xs text-slate-500">{ticket.dateTime}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Truck</p>
                          <p className="mt-1 truncate text-sm text-slate-300">{ticket.truck || "No truck assigned"}</p>
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
                            Open
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
    </AppLayout>
  );
};

export default Orders;
