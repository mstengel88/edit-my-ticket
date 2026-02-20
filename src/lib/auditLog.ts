import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "sync" | "sign_in" | "sign_out";
export type AuditEntityType = "ticket" | "template" | "profile" | "auth";

export async function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from("audit_logs" as any).insert({
      user_id: session.user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? {},
    } as any);
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
