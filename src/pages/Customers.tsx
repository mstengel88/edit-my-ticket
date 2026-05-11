import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  Mail,
  Printer,
  MapPin,
  UserRound,
  FileText,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { TicketEditor } from "@/components/TicketEditor";
import { TicketPreview } from "@/components/TicketPreview";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { TicketData } from "@/types/ticket";
import { formatTicketDateTime } from "@/types/ticket";
import companyLogo from "@/assets/Greenhillssupply_logo.png";

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface CustomerTicket {
  id: string;
  bucket: string;
  company_email: string;
  company_name: string;
  company_phone: string;
  company_website: string;
  job_number: string;
  job_name: string;
  date_time: string;
  created_at: string;
  issued_at: string | null;
  product: string;
  order_id: string | null;
  order_sequence: number | null;
  total_amount: string;
  total_unit: string;
  status: string;
  truck: string;
  note: string;
  customer_email: string;
  customer_address: string;
  customer_name: string;
  customer: string;
  signature: string;
}

const statusBadgeVariant = (status: string): "default" | "secondary" | "outline" => {
  if (status === "completed") return "default";
  if (status === "pending") return "secondary";
  return "outline";
};

const Customers = () => {
  const { session } = useAuth();
  const { isDeveloper } = useUserRole();
  const { fields: templateFields, canvasElements, copiesPerPage, canvasWidth, canvasHeight, emailElements, printLayouts } = useTicketTemplate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const useCompactActions = isMobile || isTablet;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerTickets, setCustomerTickets] = useState<CustomerTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);
  const [printTicket, setPrintTicket] = useState<TicketData | null>(null);
  const [pendingPrint, setPendingPrint] = useState(false);

  const mapTicket = (ticket: CustomerTicket): TicketData => ({
    id: ticket.id,
    jobNumber: ticket.job_number,
    jobName: ticket.job_name,
    dateTime: ticket.date_time,
    orderId: ticket.order_id,
    orderSequence: ticket.order_sequence,
    issuedAt: ticket.issued_at,
    companyName: ticket.company_name,
    companyEmail: ticket.company_email,
    companyWebsite: ticket.company_website,
    companyPhone: ticket.company_phone,
    totalAmount: ticket.total_amount,
    totalUnit: ticket.total_unit,
    customer: ticket.customer,
    product: ticket.product,
    truck: ticket.truck,
    note: ticket.note,
    bucket: ticket.bucket,
    customerName: ticket.customer_name,
    customerEmail: ticket.customer_email,
    customerAddress: ticket.customer_address,
    signature: ticket.signature,
    status: ticket.status as TicketData["status"],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("id, name, email").order("name");
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      ),
    [customers, search]
  );

  useEffect(() => {
    if (!filtered.length) {
      setSelectedCustomerId(null);
      return;
    }

    if (!selectedCustomerId || !filtered.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(filtered[0].id);
    }
  }, [filtered, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => filtered.find((customer) => customer.id === selectedCustomerId) ?? customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, filtered, selectedCustomerId]
  );

  const loadCustomerTickets = useCallback(async (customerName: string) => {
    setTicketsLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("customer", customerName)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load customer tickets");
      setCustomerTickets([]);
      setTicketsLoading(false);
      return;
    }

    setCustomerTickets((data as CustomerTicket[]) ?? []);
    setTicketsLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedCustomer?.name) {
      setCustomerTickets([]);
      return;
    }

    loadCustomerTickets(selectedCustomer.name);
  }, [loadCustomerTickets, selectedCustomer?.name]);

  useEffect(() => {
    if (!pendingPrint || !printTicket) return;

    const timeout = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("ticket-print-request"));
      setPendingPrint(false);
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [pendingPrint, printTicket]);

  const handleSync = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    setSyncing(true);
    try {
      const { data: tickets } = await supabase.from("tickets").select("customer").eq("user_id", userId);
      const names = [...new Set((tickets ?? []).map((t) => t.customer).filter(Boolean))];
      if (!names.length) {
        toast.info("No customers found in tickets");
        setSyncing(false);
        return;
      }

      let added = 0;
      for (const name of names) {
        const { error } = await supabase.from("customers").upsert(
          { name, user_id: userId, email: "" },
          { onConflict: "name" }
        );
        if (!error) added++;
      }

      toast.success(`Synced ${added} customers from tickets`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
    setSyncing(false);
  };

  const handleExportCsv = () => {
    if (!filtered.length) return toast.info("No customers to export");
    const csv = ["Name,Email", ...filtered.map((c) => `"${c.name.replace(/"/g, '""')}","${c.email}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const userId = session?.user?.id;
      if (!userId) return;
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      let added = 0;
      for (let i = start; i < lines.length; i++) {
        const match = lines[i].match(/^"?([^",]+)"?\s*,?\s*"?([^"]*)"?$/);
        if (!match) continue;
        const name = match[1].trim();
        const email = match[2]?.trim() || "";
        if (!name) continue;
        const { error } = await supabase.from("customers").upsert(
          { name, email, user_id: userId },
          { onConflict: "name" }
        );
        if (!error) added++;
      }
      toast.success(`Imported ${added} customers`);
      load();
    };
    input.click();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "" });
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({ name: customer.name, email: customer.email });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const userId = session?.user?.id;
    if (!userId) return;
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("customers")
        .update({ name: form.name.trim(), email: form.email.trim() })
        .eq("id", editing.id);

      if (error) toast.error("Failed to update customer");
      else toast.success("Customer updated");
    } else {
      const { error } = await supabase
        .from("customers")
        .insert({ name: form.name.trim(), email: form.email.trim(), user_id: userId });

      if (error) {
        toast.error(error.message.includes("duplicate") ? "Customer already exists" : "Failed to add customer");
      } else {
        toast.success("Customer added");
      }
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete "${customer.name}"?`)) return;

    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("customer", customer.name);

    if (count && count > 0) {
      toast.error(`Cannot delete "${customer.name}" — they have ${count} ticket(s) in the system`);
      return;
    }

    await supabase.from("customers").delete().eq("id", customer.id);
    toast.success("Customer deleted");
    load();
  };

  const latestTicket = customerTickets[0] ?? null;
  const customerEmail = selectedCustomer?.email || customerTickets.find((ticket) => ticket.customer_email)?.customer_email || "";
  const customerAddress = customerTickets.find((ticket) => ticket.customer_address)?.customer_address || "";
  const customerContact = customerTickets.find((ticket) => ticket.customer_name)?.customer_name || "";
  const completedCount = customerTickets.filter((ticket) => ticket.status === "completed").length;
  const pendingCount = customerTickets.filter((ticket) => ticket.status === "pending").length;

  const openTicketEditor = (ticket: CustomerTicket) => {
    setEditingTicket(mapTicket(ticket));
  };

  const handlePrintTicket = (ticket: CustomerTicket | TicketData) => {
    const nextTicket = "job_number" in ticket ? mapTicket(ticket) : ticket;
    setPrintTicket(nextTicket);
    setPendingPrint(true);
  };

  const handleSaveTicket = async (updated: TicketData) => {
    const ticketToSave: TicketData = {
      ...updated,
      status: updated.status === "draft" ? "pending" : updated.status,
    };
    const { error } = await supabase
      .from("tickets")
      .update({
        job_number: ticketToSave.jobNumber,
        job_name: ticketToSave.jobName,
        date_time: ticketToSave.dateTime,
        order_id: ticketToSave.orderId,
        order_sequence: ticketToSave.orderSequence,
        issued_at: ticketToSave.issuedAt,
        company_name: ticketToSave.companyName,
        company_email: ticketToSave.companyEmail,
        company_website: ticketToSave.companyWebsite,
        company_phone: ticketToSave.companyPhone,
        total_amount: ticketToSave.totalAmount,
        total_unit: ticketToSave.totalUnit,
        customer: ticketToSave.customer,
        product: ticketToSave.product,
        truck: ticketToSave.truck,
        note: ticketToSave.note,
        bucket: ticketToSave.bucket,
        customer_name: ticketToSave.customerName,
        customer_email: ticketToSave.customerEmail,
        customer_address: ticketToSave.customerAddress,
        signature: ticketToSave.signature,
        status: ticketToSave.status,
      })
      .eq("id", ticketToSave.id);

    if (error) {
      toast.error("Failed to save ticket");
      return false;
    }

    setEditingTicket(null);
    if (selectedCustomer?.name) {
      loadCustomerTickets(selectedCustomer.name);
    }
    return true;
  };

  const handleIssueTicket = async (updated: TicketData) => {
    const ticketToSave: TicketData = {
      ...updated,
      issuedAt: updated.issuedAt ?? new Date().toISOString(),
      dateTime: formatTicketDateTime(),
      status: updated.status === "draft" ? "pending" : updated.status,
    };

    const { error } = await supabase
      .from("tickets")
      .update({
        job_number: ticketToSave.jobNumber,
        job_name: ticketToSave.jobName,
        date_time: ticketToSave.dateTime,
        order_id: ticketToSave.orderId,
        order_sequence: ticketToSave.orderSequence,
        issued_at: ticketToSave.issuedAt,
        company_name: ticketToSave.companyName,
        company_email: ticketToSave.companyEmail,
        company_website: ticketToSave.companyWebsite,
        company_phone: ticketToSave.companyPhone,
        total_amount: ticketToSave.totalAmount,
        total_unit: ticketToSave.totalUnit,
        customer: ticketToSave.customer,
        product: ticketToSave.product,
        truck: ticketToSave.truck,
        note: ticketToSave.note,
        bucket: ticketToSave.bucket,
        customer_name: ticketToSave.customerName,
        customer_email: ticketToSave.customerEmail,
        customer_address: ticketToSave.customerAddress,
        signature: ticketToSave.signature,
        status: ticketToSave.status,
      })
      .eq("id", ticketToSave.id);

    if (error) {
      toast.error("Failed to save ticket");
      return false;
    }

    setEditingTicket(null);
    if (selectedCustomer?.name) {
      loadCustomerTickets(selectedCustomer.name);
    }
    return true;
  };

  const handleEmailTicket = async (ticket: TicketData) => {
    if (!ticket.customerEmail) {
      toast.error("No customer email set.");
      return;
    }

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
        console.warn("Could not convert logo:", e);
      }

      const { error } = await supabase.functions.invoke("send-ticket-email", {
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
    }
  };

  const headerExtra = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap" onClick={handleImportCsv}>
        <Upload className="h-4 w-4" /> Import CSV
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap" onClick={handleExportCsv}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
      {isDeveloper && (
        <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync from Tickets
        </Button>
      )}
      <Button size="sm" className="gap-1.5 whitespace-nowrap" onClick={openNew}>
        <Plus className="h-4 w-4" /> Add Customer
      </Button>
    </div>
  );

  return (
    <AppLayout title="Customers" subtitle="Review customer accounts and their full ticket history" headerExtra={useCompactActions ? undefined : headerExtra}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {useCompactActions && (
          <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-max">{headerExtra}</div>
          </div>
        )}

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_1.25fr]">
          <section className="rounded-[28px] border border-white/8 bg-[#111c2d] p-6 shadow-xl shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Customer Console</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              See every customer account and every ticket tied to it in one workspace.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This is now your account-history view: customer details, contact info, recent load activity, and direct
              ticket actions all live here without kicking you back to the main ticket desk.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Customers", value: customers.length },
                { label: "Visible", value: filtered.length },
                { label: "Tickets", value: customerTickets.length },
                { label: "Pending", value: pendingCount },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[#111c2d] p-6 shadow-xl shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Search & Focus</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Find the right account quickly</h3>
            <div className="relative mt-5 max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 border-white/10 bg-[#0d1726] pl-9 text-white placeholder:text-slate-500"
              />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Search by customer name or email, then use the left list as your account rail.
            </p>
          </section>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {search ? "No customers match your search" : "No customers yet. Add one to get started!"}
          </p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <Card className="overflow-hidden border-white/8 bg-[#111c2d] shadow-xl shadow-black/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Customer List</CardTitle>
                <CardDescription>Select a customer to see their information and ticket history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filtered.map((customer) => {
                  const isSelected = customer.id === selectedCustomerId;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-cyan-300/20 bg-cyan-400/8"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{customer.name}</p>
                          <p className="mt-1 truncate text-sm text-slate-400">{customer.email || "No email on file"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-300 hover:bg-white/5 hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(customer);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-300 hover:bg-rose-400/10"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(customer);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {selectedCustomer ? (
                <>
                  <Card className="border-white/8 bg-[#111c2d] shadow-xl shadow-black/10">
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl text-white">{selectedCustomer.name}</CardTitle>
                          <CardDescription className="mt-1">
                            Customer profile and ticket history
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{customerTickets.length} tickets</Badge>
                          {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
                          {completedCount > 0 && <Badge>{completedCount} completed</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <Mail className="h-4 w-4 text-slate-400" />
                          Email
                        </div>
                        <p className="mt-2 break-words text-sm text-slate-400">{customerEmail || "No email on file"}</p>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <UserRound className="h-4 w-4 text-slate-400" />
                          Contact Name
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{customerContact || "No contact captured yet"}</p>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          Address
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{customerAddress || "No address captured yet"}</p>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <FileText className="h-4 w-4 text-slate-400" />
                          Most Recent Ticket
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          {latestTicket ? `${latestTicket.job_number} • ${latestTicket.date_time}` : "No tickets yet"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-white/8 bg-[#111c2d] shadow-xl shadow-black/10">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg text-white">Ticket History</CardTitle>
                      <CardDescription>Every ticket currently linked to this customer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ticketsLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : customerTickets.length === 0 ? (
                        <p className="py-8 text-sm text-slate-400">No tickets found for this customer yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {customerTickets.map((ticket) => (
                            <div
                              key={ticket.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => openTicketEditor(ticket)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") openTicketEditor(ticket);
                              }}
                              className="block w-full cursor-pointer rounded-lg border border-white/8 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06]"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-white">{ticket.job_number}</p>
                                    <Badge variant={statusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-400">{ticket.date_time}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-semibold text-white">{ticket.total_amount}</p>
                                  <p className="text-xs text-cyan-300">{ticket.total_unit}</p>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Product</p>
                                  <p className="mt-1 flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    <span>{ticket.product || "—"}</span>
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">PO #</p>
                                  <p className="mt-1">{ticket.job_name || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Truck</p>
                                  <p className="mt-1">{ticket.truck || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Note</p>
                                  <p className="mt-1">{ticket.note || "—"}</p>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handlePrintTicket(ticket);
                                  }}
                                >
                                  <Printer className="h-4 w-4" /> Print
                                </Button>
                                <Button
                                  size="sm"
                                  className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTicketEditor(ticket);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" /> Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-white/8 bg-[#111c2d] shadow-xl shadow-black/10">
                  <CardContent className="py-14 text-center text-slate-400">
                    Select a customer to see their details.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#111c2d] text-white">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Customer name"
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="customer@example.com"
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTicket} onOpenChange={(open) => !open && setEditingTicket(null)}>
        <DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto border-white/10 bg-[#111c2d] text-white">
          <DialogHeader>
            <DialogTitle>{editingTicket ? `Edit Ticket ${editingTicket.jobNumber}` : "Edit Ticket"}</DialogTitle>
          </DialogHeader>
          {editingTicket && (
            <TicketEditor
              ticket={editingTicket}
              onSave={handleSaveTicket}
              onIssue={handleIssueTicket}
              onPrint={handlePrintTicket}
              onEmail={handleEmailTicket}
              templateFields={templateFields}
            />
          )}
        </DialogContent>
      </Dialog>

      {printTicket && (
        <div className="hidden">
          <TicketPreview
            ticket={printTicket}
            canvasElements={canvasElements}
            emailElements={emailElements}
            copiesPerPage={copiesPerPage}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            printLayouts={printLayouts}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default Customers;
