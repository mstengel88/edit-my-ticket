import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "user";

export const useUserRole = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  // Listen for auth changes directly to avoid race conditions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId === undefined) {
      setLoading(true);
      return;
    }

    if (userId === null) {
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
  }, [userId]);

  const isAdminOrManager = role === "admin" || role === "manager";

  return { role, loading, isAdminOrManager };
};
