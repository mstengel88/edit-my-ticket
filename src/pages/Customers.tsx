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
  MapPin,
  UserRound,
  FileText,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface CustomerTicket {
  id: string;
  job_number: string;
  job_name: string;
  date_time: string;
  created_at: string;
  product: string;
  total_amount: string;
  total_unit: string;
  status: string;
  truck: string;
  note: string;
  customer_email: string;
  customer_address: string;
  customer_name: string;
}

const statusBadgeVariant = (status: string): "default" | "secondary" | "outline" => {
  if (status === "completed") return "default";
  if (status === "pending") return "secondary";
  return "outline";
};

const Customers = () => {
  const { session } = useAuth();
  const { isDeveloper } = useUserRole();
  const navigate = useNavigate();
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
      .select("id, job_number, job_name, date_time, created_at, product, total_amount, total_unit, status, truck, note, customer_email, customer_address, customer_name")
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

  const openTicket = (ticketId: string) => {
    navigate("/", { state: { openTicketId: ticketId } });
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
    <AppLayout title="Customers" headerExtra={useCompactActions ? undefined : headerExtra}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {useCompactActions && (
          <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-max">{headerExtra}</div>
          </div>
        )}

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
            <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Customer List</CardTitle>
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
                          ? "border-primary bg-primary/8"
                          : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{customer.name}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">{customer.email || "No email on file"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8"
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
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl">{selectedCustomer.name}</CardTitle>
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
                      <div className="rounded-lg border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email
                        </div>
                        <p className="mt-2 break-words text-sm text-muted-foreground">{customerEmail || "No email on file"}</p>
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          Contact Name
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{customerContact || "No contact captured yet"}</p>
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Address
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{customerAddress || "No address captured yet"}</p>
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Most Recent Ticket
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {latestTicket ? `${latestTicket.job_number} • ${latestTicket.date_time}` : "No tickets yet"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Ticket History</CardTitle>
                      <CardDescription>Every ticket currently linked to this customer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ticketsLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : customerTickets.length === 0 ? (
                        <p className="py-8 text-sm text-muted-foreground">No tickets found for this customer yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {customerTickets.map((ticket) => (
                            <button
                              key={ticket.id}
                              type="button"
                              onClick={() => openTicket(ticket.id)}
                              className="block w-full rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{ticket.job_number}</p>
                                    <Badge variant={statusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">{ticket.date_time}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-semibold">{ticket.total_amount}</p>
                                  <p className="text-xs text-muted-foreground">{ticket.total_unit}</p>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/80">Product</p>
                                  <p className="mt-1 flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    <span>{ticket.product || "—"}</span>
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/80">PO #</p>
                                  <p className="mt-1">{ticket.job_name || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/80">Truck</p>
                                  <p className="mt-1">{ticket.truck || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/80">Note</p>
                                  <p className="mt-1">{ticket.note || "—"}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-14 text-center text-muted-foreground">
                    Select a customer to see their details.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Customers;
