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
    <AppLayout title="Trucks" headerExtra={useCompactActions ? undefined : headerExtra}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {useCompactActions && (
          <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-max">{headerExtra}</div>
          </div>
        )}

        {duplicateGroups.length > 0 && (
          <Card className="mb-4 border-amber-300/60 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base">Truck duplicates detected</CardTitle>
              </div>
              <CardDescription>
                Trucks were being saved without consistent normalization, so values with spacing or casing differences could be treated as separate entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {duplicateGroups.map((group) => (
                <div key={group.map((truck) => truck.id).join("-")} className="rounded-md border bg-background px-3 py-2">
                  <span className="font-medium">{group.map((truck) => truck.name).join(", ")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search trucks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {search ? "No trucks match your search" : "No trucks yet. Add one to get started!"}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
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
                      <TableCell className="font-medium">{truck.name}</TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <Badge variant="secondary" className="text-xs">Duplicate</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(truck)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(truck)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Truck" : "Add Truck"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                placeholder="GREENHILLS-101"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                New truck names must start with <span className="font-medium">GREENHILLS-</span>.
              </p>
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

export default Trucks;
