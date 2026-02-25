import { useState, useEffect } from "react";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { CanvasElement, ReportField } from "@/types/template";
import { TicketData, sampleTickets } from "@/types/ticket";
import { TicketPreview } from "@/components/TicketPreview";
import { CanvasEditor } from "@/components/template-editor/CanvasEditor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserRolesManager } from "@/components/UserRolesManager";
import { useUserRole } from "@/hooks/useUserRole";

function ReportFieldItem({ field, onToggle }: { field: ReportField; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
      <span className="flex-1 text-sm font-medium text-foreground">{field.label}</span>
      <Switch checked={field.visible} onCheckedChange={() => onToggle(field.id)} />
    </div>
  );
}

const Settings = () => {
  const navigate = useNavigate();
  const { fields, canvasElements, reportFields, copiesPerPage, loading, saveTemplate } = useTicketTemplate();
  const { role } = useUserRole();
  const [localCanvas, setLocalCanvas] = useState<CanvasElement[]>([]);
  const [localReportFields, setLocalReportFields] = useState<ReportField[]>([]);
  const [localCopies, setLocalCopies] = useState(2);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocalCanvas(canvasElements);
    setLocalReportFields(reportFields);
    setLocalCopies(copiesPerPage);
  }, [canvasElements, reportFields, copiesPerPage]);

  const handleCanvasChange = (els: CanvasElement[]) => {
    setLocalCanvas(els);
    setDirty(true);
  };

  const handleReportToggle = (id: string) => {
    setLocalReportFields((prev) => prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)));
    setDirty(true);
  };

  const handleSave = async () => {
    await saveTemplate(fields, localCopies, localReportFields, localCanvas);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Template Settings</h1>
          </div>
          <Button onClick={handleSave} disabled={!dirty} size="sm" className="gap-1.5">
            <Save className="h-4 w-4" /> Save Template
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6">
        <Tabs defaultValue="designer">
          <TabsList className="mb-4">
            <TabsTrigger value="designer">Ticket Designer</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            {role === "admin" && (
              <TabsTrigger value="roles" className="gap-1.5">
                <Users className="h-4 w-4" /> User Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="designer">
            <CanvasEditor elements={localCanvas} onChange={handleCanvasChange} sampleTicket={sampleTicket} />

            {/* Copies per page */}
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
              <TicketPreview ticket={sampleTicket} canvasElements={localCanvas} copiesPerPage={localCopies} />
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

          {role === "admin" && (
            <TabsContent value="roles">
              <UserRolesManager />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
