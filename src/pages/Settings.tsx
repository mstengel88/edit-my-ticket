import { useState, useEffect } from "react";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { CanvasElement, ReportField } from "@/types/template";
import { TicketData, sampleTickets } from "@/types/ticket";
import { TicketPreview } from "@/components/TicketPreview";
import { CanvasEditor } from "@/components/template-editor/CanvasEditor";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Users, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserRolesManager } from "@/components/UserRolesManager";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";

function ReportFieldItem({ field, onToggle }: { field: ReportField; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
      <span className="flex-1 text-sm font-medium text-foreground">{field.label}</span>
      <Switch checked={field.visible} onCheckedChange={() => onToggle(field.id)} />
    </div>
  );
}

const Settings = () => {
  const { role } = useUserRole();
  const { fields, canvasElements, reportFields, copiesPerPage, canvasWidth: savedWidth, canvasHeight: savedHeight, loading, saveTemplate } = useTicketTemplate();

  const [localCanvas, setLocalCanvas] = useState<CanvasElement[]>(canvasElements);
  const [localCopies, setLocalCopies] = useState(copiesPerPage);
  const [localReportFields, setLocalReportFields] = useState<ReportField[]>(reportFields);
  const [localWidth, setLocalWidth] = useState(savedWidth);
  const [localHeight, setLocalHeight] = useState(savedHeight);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocalCanvas(canvasElements);
    setLocalCopies(copiesPerPage);
    setLocalReportFields(reportFields);
    setLocalWidth(savedWidth);
    setLocalHeight(savedHeight);
  }, [canvasElements, copiesPerPage, reportFields, savedWidth, savedHeight]);

  const handleCanvasChange = (elements: CanvasElement[]) => { setLocalCanvas(elements); setDirty(true); };
  const handleReportToggle = (id: string) => {
    setLocalReportFields((prev) => prev.map((f) => f.id === id ? { ...f, visible: !f.visible } : f));
    setDirty(true);
  };

  const handleSave = async () => {
    await saveTemplate(fields, localCopies, localReportFields, localCanvas, localWidth, localHeight);
    setDirty(false);
    toast.success("Template saved!");
  };

  const handleCopiesChange = (value: string) => {
    setLocalCopies(Number(value));
    setDirty(true);
  };

  const sampleTicket: TicketData = sampleTickets[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const headerExtra = (
    <Button onClick={handleSave} disabled={!dirty} size="sm" className="gap-1.5">
      <Save className="h-4 w-4" /> Save Template
    </Button>
  );

  return (
    <AppLayout title="Settings" headerExtra={headerExtra}>
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <Tabs defaultValue="designer">
          <TabsList className="mb-4">
            <TabsTrigger value="designer">Ticket Designer</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            {(role === "admin" || role === "developer") && (
              <TabsTrigger value="roles" className="gap-1.5">
                <Users className="h-4 w-4" /> User Roles
              </TabsTrigger>
            )}
            <TabsTrigger value="feedback" className="gap-1.5">
              <MessageSquarePlus className="h-4 w-4" /> Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="designer">
            <CanvasEditor
              elements={localCanvas}
              onChange={handleCanvasChange}
              sampleTicket={sampleTicket}
              canvasWidth={localWidth}
              canvasHeight={localHeight}
              onCanvasSizeChange={(w, h) => { setLocalWidth(w); setLocalHeight(h); setDirty(true); }}
            />
            <div className="mt-6 flex items-center gap-3">
              <Label className="text-sm font-medium text-foreground whitespace-nowrap">Tickets per page</Label>
              <Select value={String(localCopies)} onValueChange={handleCopiesChange}>
                <SelectTrigger className="w-20 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="pointer-events-none">
              <TicketPreview ticket={sampleTicket} canvasElements={localCanvas} copiesPerPage={localCopies} canvasWidth={localWidth} canvasHeight={localHeight} />
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="max-w-md">
              <h2 className="text-sm font-semibold text-foreground mb-3">Toggle columns to show/hide in reports</h2>
              <div className="space-y-1.5">
                {localReportFields.map((field) => (
                  <ReportFieldItem key={field.id} field={field} onToggle={handleReportToggle} />
                ))}
              </div>
            </div>
          </TabsContent>

          {(role === "admin" || role === "developer") && (
            <TabsContent value="roles">
              <UserRolesManager />
            </TabsContent>
          )}

          <TabsContent value="feedback">
            <FeedbackForm />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
