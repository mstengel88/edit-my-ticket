import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CanvasElement, DEFAULT_CANVAS_ELEMENTS, CANVAS_WIDTH, CANVAS_HEIGHT,
  TemplateField, DEFAULT_TEMPLATE_FIELDS,
  ReportField, DEFAULT_REPORT_FIELDS,
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

  const loadTemplate = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ticket_templates")
      .select("*")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      setTemplateId(data.id);
      const layout = data.layout as any;

      if (layout && typeof layout === "object" && !Array.isArray(layout)) {
        // New canvas format
        if (Array.isArray(layout.canvasElements) && layout.canvasElements.length > 0) {
          setCanvasElements(layout.canvasElements);
        }
        // Legacy fields
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
      } else if (Array.isArray(layout)) {
        // Very old format: just fields array
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
    ) => {
      if (!session?.user) return;
      setFields(updatedFields);
      if (updatedCopies !== undefined) setCopiesPerPage(updatedCopies);
      if (updatedReportFields) setReportFields(updatedReportFields);
      if (updatedCanvasElements) setCanvasElements(updatedCanvasElements);
      if (updatedCanvasWidth !== undefined) setCanvasWidth(updatedCanvasWidth);
      if (updatedCanvasHeight !== undefined) setCanvasHeight(updatedCanvasHeight);

      const layoutData = {
        fields: updatedFields,
        copiesPerPage: updatedCopies ?? copiesPerPage,
        reportFields: updatedReportFields ?? reportFields,
        canvasElements: updatedCanvasElements ?? canvasElements,
        canvasWidth: updatedCanvasWidth ?? canvasWidth,
        canvasHeight: updatedCanvasHeight ?? canvasHeight,
      };

      if (templateId) {
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
    [session?.user, templateId, copiesPerPage, reportFields, canvasElements, canvasWidth, canvasHeight]
  );

  return { fields, canvasElements, reportFields, copiesPerPage, canvasWidth, canvasHeight, loading, saveTemplate };
}
