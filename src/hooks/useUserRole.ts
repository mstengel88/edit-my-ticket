import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "manager" | "user";

export const useUserRole = () => {
  const { session, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    const userId = session?.user?.id;

    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setRole("user");
      } else {
        setRole(data.role as AppRole);
      }
      setLoading(false);
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, authLoading]);

  const isAdminOrManager = role === "admin" || role === "manager";

  return { role, loading, isAdminOrManager };
};
