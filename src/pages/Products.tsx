import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Loader2, RefreshCw, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { getProducts as getLoadriteProducts } from "@/services/loadrite";

interface Product {
  id: string;
  name: string;
  source: string;
}

const Products = () => {
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    setSyncing(true);
    try {
      const lrProducts = await getLoadriteProducts();
      if (!lrProducts?.length) { toast.info("No products found in Loadrite"); setSyncing(false); return; }
      const names = [...new Set(lrProducts.map((p: { Name: string }) => p.Name).filter(Boolean))];
      let added = 0;
      for (const name of names) {
        const { error } = await supabase.from("products").upsert(
          { name: name as string, user_id: userId, source: "loadrite" },
          { onConflict: "name" }
        );
        if (!error) added++;
      }
      toast.success(`Synced ${added} products from Loadrite`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
    setSyncing(false);
  };

  const handleExportCsv = () => {
    if (!filtered.length) return toast.info("No products to export");
    const csv = ["Name,Source", ...filtered.map((p) => `"${p.name.replace(/"/g, '""')}","${p.source}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "products.csv"; a.click();
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
        const match = lines[i].match(/^"?([^",]+)"?/);
        if (!match) continue;
        const name = match[1].trim();
        if (!name) continue;
        const { error } = await supabase.from("products").upsert(
          { name, user_id: userId, source: "csv" },
          { onConflict: "name" }
        );
        if (!error) added++;
      }
      toast.success(`Imported ${added} products`);
      load();
    };
    input.click();
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("id, name, source").order("name");
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: "" }); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const userId = session?.user?.id;
    if (!userId) return;
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from("products").update({ name: form.name.trim() }).eq("id", editing.id);
      if (error) toast.error("Failed to update product");
      else toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert({ name: form.name.trim(), user_id: userId, source: "manual" });
      if (error) toast.error(error.message.includes("duplicate") ? "Product already exists" : "Failed to add product");
      else toast.success("Product added");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    toast.success("Product deleted");
    load();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const headerExtra = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleImportCsv}>
        <Upload className="h-4 w-4" /> Import CSV
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCsv}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSync} disabled={syncing}>
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Loadrite
      </Button>
      <Button size="sm" className="gap-1.5" onClick={openNew}>
        <Plus className="h-4 w-4" /> Add Product
      </Button>
    </div>
  );

  return (
    <AppLayout title="Products" headerExtra={headerExtra}>
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {search ? "No products match your search" : "No products yet. Add one to get started!"}
          </p>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={p.source === "loadrite" ? "default" : "secondary"} className="text-xs">
                        {p.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
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
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} placeholder="Product name" />
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

export default Products;
