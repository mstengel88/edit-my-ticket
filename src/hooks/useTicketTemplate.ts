import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TemplateField, DEFAULT_TEMPLATE_FIELDS } from "@/types/template";

export function useTicketTemplate() {
  const { session } = useAuth();
  const [fields, setFields] = useState<TemplateField[]>(DEFAULT_TEMPLATE_FIELDS);
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
      const layout = data.layout as unknown as TemplateField[];
      if (Array.isArray(layout) && layout.length > 0) {
        // Merge with defaults to pick up any new fields added later
        const savedKeys = new Set(layout.map((f) => f.id));
        const merged = [
          ...layout,
          ...DEFAULT_TEMPLATE_FIELDS.filter((f) => !savedKeys.has(f.id)),
        ];
        setFields(merged);
      }
    }
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const saveTemplate = useCallback(
    async (updatedFields: TemplateField[]) => {
      if (!session?.user) return;
      setFields(updatedFields);

      if (templateId) {
        await supabase
          .from("ticket_templates")
          .update({ layout: updatedFields as any })
          .eq("id", templateId);
      } else {
        const { data } = await supabase
          .from("ticket_templates")
          .insert({
            user_id: session.user.id,
            layout: updatedFields as any,
          })
          .select("id")
          .single();
        if (data) setTemplateId(data.id);
      }
    },
    [session?.user, templateId]
  );

  return { fields, loading, saveTemplate };
}
