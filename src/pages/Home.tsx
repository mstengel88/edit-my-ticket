import { useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useLoadriteData } from "@/hooks/useLoadriteData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  FileText,
  Package,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

function parseTicketDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const Home = () => {
  const { tickets, loadFromDb } = useLoadriteData();

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  const metrics = useMemo(() => {
    const today = new Date();
    const recentCutoff = new Date(today.getTime() - 1000 * 60 * 60 * 24);
    const customerSet = new Set<string>();
    const truckSet = new Set<string>();
    let tons = 0;
    let yards = 0;
    let recent = 0;

    for (const ticket of tickets) {
      if (ticket.customer?.trim()) customerSet.add(ticket.customer.trim());
      if (ticket.truck?.trim() && ticket.truck !== "-") truckSet.add(ticket.truck.trim());

      const amount = Number.parseFloat(ticket.totalAmount) || 0;
      const unit = ticket.totalUnit.toLowerCase();
      if (unit.includes("ton")) tons += amount;
      if (unit.includes("yard")) yards += amount;

      const date = parseTicketDate(ticket.dateTime);
      if (date && date >= recentCutoff) recent += 1;
    }

    return {
      tickets: tickets.length,
      recent,
      pending: tickets.filter((ticket) => ticket.status === "pending").length,
      completed: tickets.filter((ticket) => ticket.status === "completed").length,
      customers: customerSet.size,
      trucks: truckSet.size,
      tons: tons.toFixed(2),
      yards: yards.toFixed(2),
    };
  }, [tickets]);

  const recentTickets = useMemo(() => tickets.slice(0, 8), [tickets]);

  const topCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      const customer = ticket.customer?.trim() || "Unassigned";
      counts.set(customer, (counts.get(customer) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [tickets]);

  const kpis = [
    { label: "Total Tickets", value: metrics.tickets, hint: `${metrics.recent} in the last 24 hours`, icon: FileText },
    { label: "Pending Loads", value: metrics.pending, hint: `${metrics.completed} completed overall`, icon: Clock3 },
    { label: "Active Customers", value: metrics.customers, hint: `${metrics.trucks} active trucks`, icon: Users },
    { label: "Material Moved", value: `${metrics.tons} T`, hint: `${metrics.yards} yds tracked`, icon: Package },
  ];

  return (
    <AppLayout title="Home" subtitle="Ticketing operations at a glance">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 xl:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-[28px] border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(21,39,60,0.98),rgba(12,21,34,0.98))] p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Badge className="border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-200 hover:bg-cyan-400/10">
                  Operations Console
                </Badge>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Keep tickets, trucks, customers, and load activity in one live workspace.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                    This dashboard is your starting point for the day: recent ticket activity, production volume, customer demand,
                    and the fastest path back into ticket entry.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  <Link to="/">Open Ticket Desk</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  <Link to="/reports">Open Ticket Query</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                    <item.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-xs text-slate-400">{item.hint}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[#121c2c] p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Quick Access</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Jump straight into the work</h3>
              </div>
              <Truck className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="mt-5 space-y-3">
              {[
                { title: "Ticket Desk", body: "Create tickets, print, email, and manage the active queue.", href: "/" },
                { title: "Customers", body: "Review customer records and view their full ticket history.", href: "/customers" },
                { title: "Products", body: "Manage materials and keep the catalog ready for ticket entry.", href: "/products" },
                { title: "Ticket Query", body: "Filter and export ticket activity for reporting and follow-up.", href: "/reports" },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group block rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                      <p className="mt-1 text-sm leading-5 text-slate-400">{item.body}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[26px] border border-white/8 bg-[#121c2c] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live Queue</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Recent ticket activity</h3>
              </div>
              <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/5 hover:text-white">
                <Link to="/">View all tickets</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {recentTickets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-slate-400">
                  No tickets yet. Once data comes in, this panel will become your live activity feed.
                </div>
              )}
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[1.2fr_1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">#{ticket.jobNumber}</span>
                      <Badge
                        className="border-none bg-white/8 text-slate-200 capitalize hover:bg-white/8"
                        variant="secondary"
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-300">{ticket.customer || "No customer"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{ticket.product || "No product"} · {ticket.dateTime}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">PO / Truck</p>
                    <p className="mt-1 truncate text-sm text-slate-300">{ticket.jobName || "No PO"}</p>
                    <p className="truncate text-xs text-slate-500">{ticket.truck || "No truck assigned"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-white">{ticket.totalAmount}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{ticket.totalUnit}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6">
            <div className="rounded-[26px] border border-white/8 bg-[#121c2c] p-5 shadow-xl shadow-black/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Top Customers</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Most active accounts</h3>
              <div className="mt-5 space-y-3">
                {topCustomers.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 px-6 py-8 text-center text-sm text-slate-400">
                    Customer activity will show up here as tickets are created.
                  </div>
                )}
                {topCustomers.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      <p className="text-xs text-slate-500">Customer traffic in the current dataset</p>
                    </div>
                    <div className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/8 bg-[#121c2c] p-5 shadow-xl shadow-black/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workflow</p>
              <h3 className="mt-2 text-xl font-semibold text-white">How the desk should flow</h3>
              <div className="mt-5 space-y-3">
                {[
                  "Review the queue and open the next pending ticket.",
                  "Confirm customer, PO, truck, and product before saving.",
                  "Print or email directly from the ticket desk once the load is confirmed.",
                  "Use Ticket Query to audit totals and customer history later in the day.",
                ].map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;
