import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Loader2, RefreshCw, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";

interface Customer {
  id: string;
  name: string;
  email: string;
}

const Customers = () => {
  const { session } = useAuth();
  const { isDeveloper } = useUserRole();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    setSyncing(true);
    try {
      // Pull unique customer names from tickets (sourced from Loadrite UserData1)
      const { data: tickets } = await supabase.from("tickets").select("customer").eq("user_id", userId);
      const names = [...new Set((tickets ?? []).map((t) => t.customer).filter(Boolean))];
      if (!names.length) { toast.info("No customers found in tickets"); setSyncing(false); return; }
      let added = 0;
      for (const name of names) {
        const { error } = await supabase.from("customers").upsert(
          { name, user_id: userId, email: "" },
          { onConflict: "name,user_id" }
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
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click();
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
      // Skip header if it looks like one
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
          { onConflict: "name,user_id" }
        );
        if (!error) added++;
      }
      toast.success(`Imported ${added} customers`);
      load();
    };
    input.click();
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("id, name, email").order("name");
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: "", email: "" }); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, email: c.email }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const userId = session?.user?.id;
    if (!userId) return;
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from("customers").update({ name: form.name.trim(), email: form.email.trim() }).eq("id", editing.id);
      if (error) toast.error("Failed to update customer");
      else toast.success("Customer updated");
    } else {
      const { error } = await supabase.from("customers").insert({ name: form.name.trim(), email: form.email.trim(), user_id: userId });
      if (error) toast.error(error.message.includes("duplicate") ? "Customer already exists" : "Failed to add customer");
      else toast.success("Customer added");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    // Check if customer has any tickets
    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("customer", c.name);
    if (count && count > 0) {
      toast.error(`Cannot delete "${c.name}" — they have ${count} ticket(s) in the system`);
      return;
    }
    await supabase.from("customers").delete().eq("id", c.id);
    toast.success("Customer deleted");
    load();
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const headerExtra = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCsv}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
      {isDeveloper && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync from Tickets
        </Button>
      )}
      <Button size="sm" className="gap-1.5" onClick={openNew}>
        <Plus className="h-4 w-4" /> Add Customer
      </Button>
    </div>
  );

  return (
    <AppLayout title="Customers" headerExtra={headerExtra}>
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {search ? "No customers match your search" : "No customers yet. Add one to get started!"}
          </p>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="customer@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
