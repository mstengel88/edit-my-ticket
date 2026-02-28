import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const feedbackSchema = z.object({
  type: z.enum(["feature", "bug"]),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be under 200 characters"),
  description: z.string().trim().max(2000, "Description must be under 2000 characters"),
});

interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_id: string;
  submitted_by?: string;
}

const STATUSES = ["open", "in_progress", "done", "closed"] as const;

export function FeedbackForm() {
  const { session } = useAuth();
  const { isAdminOrManager } = useUserRole();
  const [type, setType] = useState<"feature" | "bug">("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadFeedback = async () => {
    if (!session?.user) return;
    setLoadingItems(true);
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as (FeedbackItem)[];
    // Fetch display names for submitters
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
    const mapped = rows.map((r) => ({ ...r, submitted_by: nameMap.get(r.user_id) || "Unknown" }));
    setItems(mapped);
    setLoadingItems(false);
  };

  useEffect(() => {
    loadFeedback();
  }, [session?.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    const result = feedbackSchema.safeParse({ type, title, description });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: session.user.id,
      type: result.data.type,
      title: result.data.title,
      description: result.data.description,
    });

    if (error) {
      toast.error("Failed to submit feedback");
    } else {
      toast.success("Feedback submitted — thank you!");
      setTitle("");
      setDescription("");
      setType("feature");
      await loadFeedback();
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("feedback")
      .update({ status: newStatus })
      .eq("id", selected.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${newStatus}`);
      setSelected({ ...selected, status: newStatus });
      await loadFeedback();
    }
    setUpdatingStatus(false);
  };

  const statusColor = (s: string) => {
    if (s === "open") return "bg-primary/15 text-primary";
    if (s === "in_progress") return "bg-warning/15 text-warning";
    if (s === "done") return "bg-success/15 text-success";
    if (s === "closed") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Submit form */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Submit Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "feature" | "bug")}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "bug" ? "Describe the issue..." : "What would you like to see?"}
                className="bg-card"
                maxLength={200}
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                className="bg-card min-h-[100px]"
                maxLength={2000}
              />
            </div>
            <Button type="submit" disabled={submitting || !title.trim()} className="gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          </form>
        </div>

        {/* Submissions list */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {isAdminOrManager ? "All Submissions" : "Your Submissions"}
          </h2>
          {loadingItems ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border bg-card px-3 py-2.5 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelected(item)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.type === "bug" ? "🐛 Bug" : "✨ Feature"}
                    </Badge>
                    <Badge className={`text-[10px] ${statusColor(item.status)}`}>
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase">
                {selected?.type === "bug" ? "🐛 Bug" : "✨ Feature"}
              </Badge>
              {selected?.title}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${statusColor(selected.status)}`}>
                    {selected.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {selected.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Submitted</Label>
                <p className="text-sm text-foreground mt-1">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>

              {/* Admin status controls */}
              {isAdminOrManager && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground mb-2 block">Update Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === s ? "default" : "outline"}
                        disabled={updatingStatus || selected.status === s}
                        onClick={() => handleStatusChange(s)}
                        className="capitalize text-xs"
                      >
                        {updatingStatus && selected.status !== s ? null : null}
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
