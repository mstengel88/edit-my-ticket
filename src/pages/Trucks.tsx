import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { isStandardTruckName, normalizeTruckName, truckNameKey } from "@/lib/truckName";

interface Truck {
  id: string;
  name: string;
}

const Trucks = () => {
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const useCompactActions = isMobile || isTablet;
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("trucks").select("id, name").order("name");
    setTrucks((data as Truck[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => trucks.filter((truck) => truck.name.toLowerCase().includes(search.toLowerCase())),
    [search, trucks]
  );

  const duplicateGroups = useMemo(() => {
    const grouped = new Map<string, Truck[]>();
    for (const truck of trucks) {
      const key = truckNameKey(truck.name);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(truck);
    }

    return [...grouped.entries()]
      .map(([, entries]) => entries)
      .filter((entries) => entries.length > 1);
  }, [trucks]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "" });
    setDialogOpen(true);
  };

  const openEdit = (truck: Truck) => {
    setEditing(truck);
    setForm({ name: truck.name });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const userId = session?.user?.id;
    const normalizedName = normalizeTruckName(form.name);
    if (!userId) return;
    if (!normalizedName) return toast.error("Truck name is required");
    if (!isStandardTruckName(normalizedName)) {
      return toast.error('Truck names must use the format "GREENHILLS-TRUCKNUMBER"');
    }

    const duplicate = trucks.find(
      (truck) => truck.id !== editing?.id && truckNameKey(truck.name) === truckNameKey(normalizedName)
    );
    if (duplicate) {
      toast.error(`Truck already exists as "${duplicate.name}"`);
      return;
    }

    setSaving(true);

    if (editing) {
      const oldName = editing.name;
      const { error } = await supabase.from("trucks").update({ name: normalizedName }).eq("id", editing.id);
      if (error) {
        toast.error("Failed to update truck");
        setSaving(false);
        return;
      }

      if (oldName !== normalizedName) {
        const { error: ticketError } = await supabase
          .from("tickets")
          .update({ truck: normalizedName })
          .eq("truck", oldName);
        if (ticketError) {
          console.error(ticketError);
        }
      }

      toast.success("Truck updated");
    } else {
      const { error } = await supabase.from("trucks").insert({ name: normalizedName, user_id: userId });
      if (error) {
        toast.error(error.message.includes("duplicate") ? "Truck already exists" : "Failed to add truck");
        setSaving(false);
        return;
      }
      toast.success("Truck added");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (truck: Truck) => {
    if (!confirm(`Delete "${truck.name}"?`)) return;

    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("truck", truck.name);

    if (count && count > 0) {
      toast.error(`Cannot delete "${truck.name}" — it is used by ${count} ticket(s)`);
      return;
    }

    await supabase.from("trucks").delete().eq("id", truck.id);
    toast.success("Truck deleted");
    load();
  };

  const headerExtra = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className="gap-1.5 whitespace-nowrap" onClick={openNew}>
        <Plus className="h-4 w-4" /> Add Truck
      </Button>
    </div>
  );

  return (
    <AppLayout title="Trucks" subtitle="Manage standardized fleet names and watch for duplicates" headerExtra={useCompactActions ? undefined : headerExtra}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {useCompactActions && (
          <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-max">{headerExtra}</div>
          </div>
        )}

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_1.25fr]">
          <section className="rounded-[28px] border border-white/8 bg-[#111c2d] p-6 shadow-xl shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fleet Console</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Keep truck names standardized before they reach tickets.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This page protects the truck list used during ticket entry. New trucks must use the `GREENHILLS-TRUCKNUMBER`
              format, and trucks tied to existing tickets stay protected from deletion.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Trucks", value: trucks.length },
                { label: "Visible", value: filtered.length },
                { label: "Duplicates", value: duplicateGroups.length },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[#111c2d] p-6 shadow-xl shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Search & Validation</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Review the active fleet list</h3>
            <div className="relative mt-5 max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input placeholder="Search trucks..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 border-white/10 bg-[#0d1726] pl-9 text-white placeholder:text-slate-500" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Use search to spot variations quickly, then clean up naming before more ticket records are created.
            </p>
          </section>
        </div>

        {duplicateGroups.length > 0 && (
          <Card className="mb-4 border-amber-300/25 bg-amber-400/8">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base text-white">Truck duplicates detected</CardTitle>
              </div>
              <CardDescription>
                Trucks were being saved without consistent normalization, so values with spacing or casing differences could be treated as separate entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {duplicateGroups.map((group) => (
                <div key={group.map((truck) => truck.id).join("-")} className="rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                  <span className="font-medium text-slate-200">{group.map((truck) => truck.name).join(", ")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {search ? "No trucks match your search" : "No trucks yet. Add one to get started!"}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-white/8 bg-[#111c2d] shadow-xl shadow-black/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((truck) => {
                  const isDuplicate = duplicateGroups.some((group) => group.some((entry) => entry.id === truck.id));
                  return (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium text-white">{truck.name}</TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <Badge variant="secondary" className="text-xs">Duplicate</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => openEdit(truck)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-300 hover:bg-rose-400/10" onClick={() => handleDelete(truck)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#111c2d] text-white">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Truck" : "Add Truck"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                placeholder="GREENHILLS-101"
                className="border-white/10 bg-[#0d1726] text-white placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-400">
                New truck names must start with <span className="font-medium">GREENHILLS-</span>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Trucks;
