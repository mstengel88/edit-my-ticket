import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CanvasElement, DEFAULT_CANVAS_ELEMENTS, CANVAS_WIDTH, CANVAS_HEIGHT,
  TemplateField, DEFAULT_TEMPLATE_FIELDS,
  ReportField, DEFAULT_REPORT_FIELDS,
  DEFAULT_TICKET_EMAIL_ELEMENTS, EMAIL_CANVAS_WIDTH, EMAIL_CANVAS_HEIGHT,
  ReportEmailConfig, DEFAULT_REPORT_EMAIL_CONFIG,
} from "@/types/template";

export function useTicketTemplate() {
  const { session } = useAuth();
  const [fields, setFields] = useState<TemplateField[]>(DEFAULT_TEMPLATE_FIELDS);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>(DEFAULT_CANVAS_ELEMENTS);
  const [reportFields, setReportFields] = useState<ReportField[]>(DEFAULT_REPORT_FIELDS);
  const [copiesPerPage, setCopiesPerPage] = useState(2);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore from a version snapshot
  const restoreVersion = (layout: any) => {
    if (layout && typeof layout === "object" && !Array.isArray(layout)) {
      if (Array.isArray(layout.canvasElements)) setCanvasElements(layout.canvasElements);
      if (Array.isArray(layout.fields)) setFields(layout.fields);
      if (layout.copiesPerPage) setCopiesPerPage(layout.copiesPerPage);
      if (layout.canvasWidth) setCanvasWidth(layout.canvasWidth);
      if (layout.canvasHeight) setCanvasHeight(layout.canvasHeight);
      if (Array.isArray(layout.reportFields)) setReportFields(layout.reportFields);
      if (Array.isArray(layout.emailElements)) setEmailElements(layout.emailElements);
      if (layout.emailCanvasWidth) setEmailCanvasWidth(layout.emailCanvasWidth);
      if (layout.emailCanvasHeight) setEmailCanvasHeight(layout.emailCanvasHeight);
      if (layout.reportEmailConfig) setReportEmailConfig({ ...DEFAULT_REPORT_EMAIL_CONFIG, ...layout.reportEmailConfig });
    }
  };

  // Email template state
  const [emailElements, setEmailElements] = useState<CanvasElement[]>(DEFAULT_TICKET_EMAIL_ELEMENTS);
  const [emailCanvasWidth, setEmailCanvasWidth] = useState(EMAIL_CANVAS_WIDTH);
  const [emailCanvasHeight, setEmailCanvasHeight] = useState(EMAIL_CANVAS_HEIGHT);
  const [reportEmailConfig, setReportEmailConfig] = useState<ReportEmailConfig>(DEFAULT_REPORT_EMAIL_CONFIG);

  const loadTemplate = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ticket_templates")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      setTemplateId(data.id);
      const layout = data.layout as any;

      if (layout && typeof layout === "object" && !Array.isArray(layout)) {
        if (Array.isArray(layout.canvasElements) && layout.canvasElements.length > 0) {
          setCanvasElements(layout.canvasElements);
        }
        if (Array.isArray(layout.fields) && layout.fields.length > 0) {
          const savedKeys = new Set(layout.fields.map((f: any) => f.id));
          setFields([...layout.fields, ...DEFAULT_TEMPLATE_FIELDS.filter((f) => !savedKeys.has(f.id))]);
        }
        if (layout.copiesPerPage) setCopiesPerPage(layout.copiesPerPage);
        if (layout.canvasWidth) setCanvasWidth(layout.canvasWidth);
        if (layout.canvasHeight) setCanvasHeight(layout.canvasHeight);
        if (Array.isArray(layout.reportFields) && layout.reportFields.length > 0) {
          const savedKeys = new Set(layout.reportFields.map((f: any) => f.id));
          setReportFields([...layout.reportFields, ...DEFAULT_REPORT_FIELDS.filter((f) => !savedKeys.has(f.id))]);
        }
        // Email templates
        if (Array.isArray(layout.emailElements) && layout.emailElements.length > 0) {
          setEmailElements(layout.emailElements);
        }
        if (layout.emailCanvasWidth) setEmailCanvasWidth(layout.emailCanvasWidth);
        if (layout.emailCanvasHeight) setEmailCanvasHeight(layout.emailCanvasHeight);
        if (layout.reportEmailConfig) setReportEmailConfig({ ...DEFAULT_REPORT_EMAIL_CONFIG, ...layout.reportEmailConfig });
      } else if (Array.isArray(layout)) {
        const savedKeys = new Set(layout.map((f: any) => f.id));
        setFields([...layout, ...DEFAULT_TEMPLATE_FIELDS.filter((f) => !savedKeys.has(f.id))]);
      }
    }
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const saveTemplate = useCallback(
    async (
      updatedFields: TemplateField[],
      updatedCopies?: number,
      updatedReportFields?: ReportField[],
      updatedCanvasElements?: CanvasElement[],
      updatedCanvasWidth?: number,
      updatedCanvasHeight?: number,
      updatedEmailElements?: CanvasElement[],
      updatedEmailCanvasWidth?: number,
      updatedEmailCanvasHeight?: number,
      updatedReportEmailConfig?: ReportEmailConfig,
    ) => {
      if (!session?.user) return;
      setFields(updatedFields);
      if (updatedCopies !== undefined) setCopiesPerPage(updatedCopies);
      if (updatedReportFields) setReportFields(updatedReportFields);
      if (updatedCanvasElements) setCanvasElements(updatedCanvasElements);
      if (updatedCanvasWidth !== undefined) setCanvasWidth(updatedCanvasWidth);
      if (updatedCanvasHeight !== undefined) setCanvasHeight(updatedCanvasHeight);
      if (updatedEmailElements) setEmailElements(updatedEmailElements);
      if (updatedEmailCanvasWidth !== undefined) setEmailCanvasWidth(updatedEmailCanvasWidth);
      if (updatedEmailCanvasHeight !== undefined) setEmailCanvasHeight(updatedEmailCanvasHeight);
      if (updatedReportEmailConfig) setReportEmailConfig(updatedReportEmailConfig);

      const layoutData = {
        fields: updatedFields,
        copiesPerPage: updatedCopies ?? copiesPerPage,
        reportFields: updatedReportFields ?? reportFields,
        canvasElements: updatedCanvasElements ?? canvasElements,
        canvasWidth: updatedCanvasWidth ?? canvasWidth,
        canvasHeight: updatedCanvasHeight ?? canvasHeight,
        emailElements: updatedEmailElements ?? emailElements,
        emailCanvasWidth: updatedEmailCanvasWidth ?? emailCanvasWidth,
        emailCanvasHeight: updatedEmailCanvasHeight ?? emailCanvasHeight,
        reportEmailConfig: updatedReportEmailConfig ?? reportEmailConfig,
      };

      if (templateId) {
        // Save version snapshot before overwriting
        await supabase.from("template_versions").insert({
          template_id: templateId,
          user_id: session.user.id,
          layout: layoutData as any,
          label: "",
        });
        await supabase
          .from("ticket_templates")
          .update({ layout: layoutData as any })
          .eq("id", templateId);
      } else {
        const { data } = await supabase
          .from("ticket_templates")
          .insert({ user_id: session.user.id, layout: layoutData as any })
          .select("id")
          .single();
        if (data) setTemplateId(data.id);
      }
    },
    [session?.user, templateId, copiesPerPage, reportFields, canvasElements, canvasWidth, canvasHeight, emailElements, emailCanvasWidth, emailCanvasHeight, reportEmailConfig]
  );

  return {
    fields, canvasElements, reportFields, copiesPerPage, canvasWidth, canvasHeight,
    emailElements, emailCanvasWidth, emailCanvasHeight, reportEmailConfig,
    loading, saveTemplate, templateId, restoreVersion,
  };
}
