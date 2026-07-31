import { useState, useEffect } from "react";
import { useTicketTemplate } from "@/hooks/useTicketTemplate";
import { CanvasElement, ReportField, ReportEmailConfig, PrintLayouts, DEFAULT_PRINT_LAYOUTS } from "@/types/template";
import { TicketData, sampleTickets } from "@/types/ticket";
import { TicketPreview } from "@/components/TicketPreview";
import { CanvasEditor } from "@/components/template-editor/CanvasEditor";
import { VersionHistory } from "@/components/template-editor/VersionHistory";
import { ReportEmailConfigEditor } from "@/components/template-editor/ReportEmailConfigEditor";
import { PrintLayoutDesigner } from "@/components/template-editor/PrintLayoutDesigner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ActivationStatus = "waiting_for_code" | "ready_to_activate" | "activated" | "needs_attention";

interface LoadriteActivationSettings {
  gatewayUrl: string;
  username: string;
  activationCode: string;
  activationCodeMasked: string;
  dealerName: string;
  deviceSerial: string;
  siteName: string;
  status: ActivationStatus;
  notes: string;
}

const DEFAULT_ACTIVATION_SETTINGS: LoadriteActivationSettings = {
  gatewayUrl: "http://192.168.36.140",
  username: "sa",
  activationCode: "",
  activationCodeMasked: "",
  dealerName: "",
  deviceSerial: "",
  siteName: "Green Hills Supply",
  status: "waiting_for_code",
  notes: "",
};

const maskActivationCode = (code: string) => {
  const trimmed = code.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "••••";
  return `${"•".repeat(Math.max(trimmed.length - 4, 4))}${trimmed.slice(-4)}`;
};

const normalizeActivationSettings = (value: unknown): LoadriteActivationSettings => {
  if (!value || typeof value !== "object") return DEFAULT_ACTIVATION_SETTINGS;
  const raw = value as Partial<LoadriteActivationSettings>;
  return {
    ...DEFAULT_ACTIVATION_SETTINGS,
    ...raw,
    activationCode: "",
    status: raw.status ?? DEFAULT_ACTIVATION_SETTINGS.status,
  };
};

function ReportFieldItem({ field, onToggle }: { field: ReportField; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
      <span className="flex-1 text-sm font-medium text-foreground">{field.label}</span>
      <Switch checked={field.visible} onCheckedChange={() => onToggle(field.id)} />
    </div>
  );
}

const Settings = () => {
  const { user } = useAuth();
  const {
    fields, canvasElements, reportFields, copiesPerPage,
    canvasWidth: savedWidth, canvasHeight: savedHeight,
    emailElements, emailCanvasWidth: savedEmailW, emailCanvasHeight: savedEmailH,
    reportEmailConfig: savedReportEmailConfig,
    printLayouts: savedPrintLayouts,
    loading, saveTemplate, templateId, restoreVersion,
  } = useTicketTemplate();

  const [localCanvas, setLocalCanvas] = useState<CanvasElement[]>(canvasElements);
  const [localCopies, setLocalCopies] = useState(copiesPerPage);
  const [localReportFields, setLocalReportFields] = useState<ReportField[]>(reportFields);
  const [localWidth, setLocalWidth] = useState(savedWidth);
  const [localHeight, setLocalHeight] = useState(savedHeight);

  // Email template state
  const [localEmailElements, setLocalEmailElements] = useState<CanvasElement[]>(emailElements);
  const [localEmailW, setLocalEmailW] = useState(savedEmailW);
  const [localEmailH, setLocalEmailH] = useState(savedEmailH);
  const [localReportEmailConfig, setLocalReportEmailConfig] = useState<ReportEmailConfig>(savedReportEmailConfig);

  // Print layout state
  const [localPrintLayouts, setLocalPrintLayouts] = useState<PrintLayouts>(savedPrintLayouts);

  const [dirty, setDirty] = useState(false);
  const [activationSettings, setActivationSettings] = useState<LoadriteActivationSettings>(DEFAULT_ACTIVATION_SETTINGS);
  const [activationLoading, setActivationLoading] = useState(true);
  const [activationSaving, setActivationSaving] = useState(false);
  const [activationDirty, setActivationDirty] = useState(false);

  useEffect(() => {
    setLocalCanvas(canvasElements);
    setLocalCopies(copiesPerPage);
    setLocalReportFields(reportFields);
    setLocalWidth(savedWidth);
    setLocalHeight(savedHeight);
    setLocalEmailElements(emailElements);
    setLocalEmailW(savedEmailW);
    setLocalEmailH(savedEmailH);
    setLocalReportEmailConfig(savedReportEmailConfig);
    setLocalPrintLayouts(savedPrintLayouts);
  }, [canvasElements, copiesPerPage, reportFields, savedWidth, savedHeight, emailElements, savedEmailW, savedEmailH, savedReportEmailConfig, savedPrintLayouts]);

  useEffect(() => {
    let isMounted = true;

    const loadActivationSettings = async () => {
      setActivationLoading(true);
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "loadrite_activation")
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load Loadrite activation settings:", error);
        toast.error("Could not load Loadrite activation settings.");
        setActivationLoading(false);
        return;
      }

      setActivationSettings(normalizeActivationSettings(data?.value));
      setActivationDirty(false);
      setActivationLoading(false);
    };

    void loadActivationSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCanvasChange = (elements: CanvasElement[]) => { setLocalCanvas(elements); setDirty(true); };
  const handleReportToggle = (id: string) => {
    setLocalReportFields((prev) => prev.map((f) => f.id === id ? { ...f, visible: !f.visible } : f));
    setDirty(true);
  };
  const handleEmailCanvasChange = (elements: CanvasElement[]) => { setLocalEmailElements(elements); setDirty(true); };
  const handleReportEmailConfigChange = (config: ReportEmailConfig) => { setLocalReportEmailConfig(config); setDirty(true); };
  const handlePrintLayoutsChange = (layouts: PrintLayouts) => { setLocalPrintLayouts(layouts); setDirty(true); };

  const handleRestore = (layout: any) => {
    restoreVersion(layout);
    if (Array.isArray(layout.canvasElements)) setLocalCanvas(layout.canvasElements);
    if (layout.copiesPerPage) setLocalCopies(layout.copiesPerPage);
    if (Array.isArray(layout.reportFields)) setLocalReportFields(layout.reportFields);
    if (layout.canvasWidth) setLocalWidth(layout.canvasWidth);
    if (layout.canvasHeight) setLocalHeight(layout.canvasHeight);
    if (Array.isArray(layout.emailElements)) setLocalEmailElements(layout.emailElements);
    if (layout.emailCanvasWidth) setLocalEmailW(layout.emailCanvasWidth);
    if (layout.emailCanvasHeight) setLocalEmailH(layout.emailCanvasHeight);
    if (layout.reportEmailConfig) setLocalReportEmailConfig({ ...localReportEmailConfig, ...layout.reportEmailConfig });
    if (layout.printLayouts) setLocalPrintLayouts({ ...DEFAULT_PRINT_LAYOUTS, ...layout.printLayouts });
    setDirty(true);
  };

  const handleSave = async () => {
    await saveTemplate(
      fields, localCopies, localReportFields, localCanvas, localWidth, localHeight,
      localEmailElements, localEmailW, localEmailH, localReportEmailConfig,
      localPrintLayouts,
    );
    setDirty(false);
    toast.success("Template saved!");
  };

  const handleCopiesChange = (value: string) => {
    setLocalCopies(Number(value));
    setDirty(true);
  };

  const handleActivationChange = <K extends keyof LoadriteActivationSettings>(
    key: K,
    value: LoadriteActivationSettings[K],
  ) => {
    setActivationSettings((current) => ({ ...current, [key]: value }));
    setActivationDirty(true);
  };

  const handleSaveActivationSettings = async () => {
    setActivationSaving(true);
    const enteredCode = activationSettings.activationCode.trim();
    const valueToSave = {
      gatewayUrl: activationSettings.gatewayUrl.trim(),
      username: activationSettings.username.trim(),
      activationCodeMasked: enteredCode
        ? maskActivationCode(enteredCode)
        : activationSettings.activationCodeMasked,
      dealerName: activationSettings.dealerName.trim(),
      deviceSerial: activationSettings.deviceSerial.trim(),
      siteName: activationSettings.siteName.trim(),
      status: enteredCode && activationSettings.status === "waiting_for_code"
        ? "ready_to_activate"
        : activationSettings.status,
      notes: activationSettings.notes.trim(),
    };

    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "loadrite_activation",
        value: valueToSave,
        updated_by: user?.id ?? null,
      });

    setActivationSaving(false);

    if (error) {
      console.error("Failed to save Loadrite activation settings:", error);
      toast.error("Could not save Loadrite activation setup.");
      return;
    }

    setActivationSettings({ ...DEFAULT_ACTIVATION_SETTINGS, ...valueToSave, activationCode: "" });
    setActivationDirty(false);
    toast.success("Loadrite activation setup saved.");
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
    <div className="flex items-center gap-2">
      <VersionHistory templateId={templateId} onRestore={handleRestore} />
      <Button onClick={handleSave} disabled={!dirty} size="sm" className="gap-1.5">
        <Save className="h-4 w-4" /> Save Template
      </Button>
    </div>
  );

  return (
    <AppLayout title="Settings" headerExtra={headerExtra}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="designer">
          <TabsList className="mb-4 h-auto flex-wrap justify-start">
            <TabsTrigger value="designer">Ticket Designer</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
            <TabsTrigger value="print-layout">Print Layout</TabsTrigger>
            <TabsTrigger value="ticket-email">Ticket Email</TabsTrigger>
            <TabsTrigger value="report-email">Report Email</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="loadrite">Loadrite Activation</TabsTrigger>
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
              <TicketPreview ticket={sampleTicket} canvasElements={localCanvas} copiesPerPage={localCopies} canvasWidth={localWidth} canvasHeight={localHeight} printLayouts={localPrintLayouts} />
            </div>
          </TabsContent>

          <TabsContent value="print-layout">
            <PrintLayoutDesigner printLayouts={localPrintLayouts} onChange={handlePrintLayoutsChange} />
          </TabsContent>

          <TabsContent value="ticket-email">
            <p className="text-sm text-muted-foreground mb-4">
              Design the email layout sent when emailing individual tickets to customers.
            </p>
            <div className="mb-4 max-w-md space-y-2">
              <Label className="text-xs text-muted-foreground">Sender Email</Label>
              <Input
                type="email"
                value={localReportEmailConfig.senderEmail}
                onChange={(event) => {
                  setLocalReportEmailConfig((current) => ({ ...current, senderEmail: event.target.value }));
                  setDirty(true);
                }}
                placeholder="info@greenhillssupply.com"
              />
            </div>
            <CanvasEditor
              elements={localEmailElements}
              onChange={handleEmailCanvasChange}
              sampleTicket={sampleTicket}
              canvasWidth={localEmailW}
              canvasHeight={localEmailH}
              onCanvasSizeChange={(w, h) => { setLocalEmailW(w); setLocalEmailH(h); setDirty(true); }}
            />
          </TabsContent>

          <TabsContent value="report-email">
            <p className="text-sm text-muted-foreground mb-4">
              Configure which sections appear in report emails and customize colors.
            </p>
            <ReportEmailConfigEditor config={localReportEmailConfig} onChange={handleReportEmailConfigChange} />
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

          <TabsContent value="loadrite">
            <div className="max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-950/70 p-5 shadow-xl">
              <div className="flex flex-col gap-3 border-b border-slate-700/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    <ShieldCheck className="h-4 w-4" />
                    Loadrite dealer setup
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Activation form ready for the dealer code</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Fill this out now, then paste the activation code when the dealer calls back. Saving the code stores only a masked reference in app settings.
                  </p>
                </div>
                <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                  {activationSettings.status.replace(/_/g, " ")}
                </div>
              </div>

              {activationLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading activation setup...
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="loadrite-gateway">Gateway URL</Label>
                    <Input
                      id="loadrite-gateway"
                      value={activationSettings.gatewayUrl}
                      onChange={(event) => handleActivationChange("gatewayUrl", event.target.value)}
                      placeholder="http://192.168.36.140"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loadrite-username">Gateway Username</Label>
                    <Input
                      id="loadrite-username"
                      value={activationSettings.username}
                      onChange={(event) => handleActivationChange("username", event.target.value)}
                      placeholder="sa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loadrite-code">Activation Code</Label>
                    <Input
                      id="loadrite-code"
                      value={activationSettings.activationCode}
                      onChange={(event) => handleActivationChange("activationCode", event.target.value)}
                      placeholder={activationSettings.activationCodeMasked || "Paste dealer code when available"}
                      autoComplete="off"
                    />
                    {activationSettings.activationCodeMasked && (
                      <p className="text-xs text-slate-500">Saved code reference: {activationSettings.activationCodeMasked}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loadrite-status">Activation Status</Label>
                    <Select
                      value={activationSettings.status}
                      onValueChange={(value) => handleActivationChange("status", value as ActivationStatus)}
                    >
                      <SelectTrigger id="loadrite-status" className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="waiting_for_code">Waiting for Code</SelectItem>
                        <SelectItem value="ready_to_activate">Ready to Activate</SelectItem>
                        <SelectItem value="activated">Activated</SelectItem>
                        <SelectItem value="needs_attention">Needs Attention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loadrite-dealer">Dealer / Contact</Label>
                    <Input
                      id="loadrite-dealer"
                      value={activationSettings.dealerName}
                      onChange={(event) => handleActivationChange("dealerName", event.target.value)}
                      placeholder="Dealer name or contact"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loadrite-serial">Device Serial</Label>
                    <Input
                      id="loadrite-serial"
                      value={activationSettings.deviceSerial}
                      onChange={(event) => handleActivationChange("deviceSerial", event.target.value)}
                      placeholder="LCI / LG500 serial"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="loadrite-site">Site Name</Label>
                    <Input
                      id="loadrite-site"
                      value={activationSettings.siteName}
                      onChange={(event) => handleActivationChange("siteName", event.target.value)}
                      placeholder="Green Hills Supply"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="loadrite-notes">Setup Notes</Label>
                    <Input
                      id="loadrite-notes"
                      value={activationSettings.notes}
                      onChange={(event) => handleActivationChange("notes", event.target.value)}
                      placeholder="Anything the dealer gives us about activation, modules, or dispatch"
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-700/80 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      This prepares Ticket Creator for activation; the actual gateway/service can read this setup once the dealer code is available.
                    </p>
                    <Button
                      onClick={() => void handleSaveActivationSettings()}
                      disabled={!activationDirty || activationSaving}
                      className="gap-1.5"
                    >
                      {activationSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Activation Setup
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
