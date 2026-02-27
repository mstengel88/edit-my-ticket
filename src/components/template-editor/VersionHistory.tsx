import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Version {
  id: string;
  created_at: string;
  label: string;
  layout: any;
}

interface Props {
  templateId: string | null;
  onRestore: (layout: any) => void;
}

export function VersionHistory({ templateId, onRestore }: Props) {
  const { session } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchVersions = async () => {
    if (!templateId || !session?.user) return;
    setLoading(true);
    const { data } = await supabase
      .from("template_versions")
      .select("id, created_at, label, layout")
      .eq("template_id", templateId)
      .order("created_at", { ascending: false })
      .limit(50);
    setVersions((data as Version[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchVersions();
  }, [open, templateId]);

  const handleRestore = (version: Version) => {
    onRestore(version.layout);
    toast.success("Template restored from version. Click Save to keep changes.");
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("template_versions").delete().eq("id", id);
    setVersions((prev) => prev.filter((v) => v.id !== id));
    toast.success("Version deleted");
  };

  if (!templateId) return null;

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <History className="h-4 w-4" /> Version History
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <History className="h-4 w-4" /> Version History
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No saved versions yet. Versions are created each time you save.</p>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1.5">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                <span className="flex-1 text-xs text-foreground truncate">
                  {format(new Date(v.created_at), "MMM d, yyyy h:mm a")}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Restore" onClick={() => handleRestore(v)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => handleDelete(v.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
