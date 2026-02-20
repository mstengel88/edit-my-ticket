import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TemplateField, DEFAULT_TEMPLATE_FIELDS, ReportField, DEFAULT_REPORT_FIELDS } from "@/types/template";

export function useTicketTemplate() {
  const { session } = useAuth();
  const [fields, setFields] = useState<TemplateField[]>(DEFAULT_TEMPLATE_FIELDS);
  const [reportFields, setReportFields] = useState<ReportField[]>(DEFAULT_REPORT_FIELDS);
  const [copiesPerPage, setCopiesPerPage] = useState(2);
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
      const layout = data.layout as unknown as { fields?: TemplateField[]; copiesPerPage?: number; reportFields?: ReportField[] } | TemplateField[];
      if (Array.isArray(layout)) {
        const savedKeys = new Set(layout.map((f) => f.id));
        const merged = [
          ...layout,
          ...DEFAULT_TEMPLATE_FIELDS.filter((f) => !savedKeys.has(f.id)),
        ];
        setFields(merged);
      } else if (layout && typeof layout === "object") {
        if (Array.isArray(layout.fields) && layout.fields.length > 0) {
          const savedKeys = new Set(layout.fields.map((f) => f.id));
          const merged = [
            ...layout.fields,
            ...DEFAULT_TEMPLATE_FIELDS.filter((f) => !savedKeys.has(f.id)),
          ];
          setFields(merged);
        }
        if (layout.copiesPerPage) setCopiesPerPage(layout.copiesPerPage);
        if (Array.isArray(layout.reportFields) && layout.reportFields.length > 0) {
          const savedKeys = new Set(layout.reportFields.map((f) => f.id));
          const merged = [
            ...layout.reportFields,
            ...DEFAULT_REPORT_FIELDS.filter((f) => !savedKeys.has(f.id)),
          ];
          setReportFields(merged);
        }
      }
    }
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const saveTemplate = useCallback(
    async (updatedFields: TemplateField[], updatedCopies?: number, updatedReportFields?: ReportField[]) => {
      if (!session?.user) return;
      setFields(updatedFields);
      if (updatedCopies !== undefined) setCopiesPerPage(updatedCopies);
      if (updatedReportFields) setReportFields(updatedReportFields);

      const layoutData = {
        fields: updatedFields,
        copiesPerPage: updatedCopies ?? copiesPerPage,
        reportFields: updatedReportFields ?? reportFields,
      };

      if (templateId) {
        await supabase
          .from("ticket_templates")
          .update({ layout: layoutData as any })
          .eq("id", templateId);
      } else {
        const { data } = await supabase
          .from("ticket_templates")
          .insert({
            user_id: session.user.id,
            layout: layoutData as any,
          })
          .select("id")
          .single();
        if (data) setTemplateId(data.id);
      }
    },
    [session?.user, templateId, copiesPerPage, reportFields]
  );

  return { fields, reportFields, copiesPerPage, loading, saveTemplate };
}
