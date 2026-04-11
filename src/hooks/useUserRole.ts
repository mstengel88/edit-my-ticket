import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "manager" | "user" | "developer";

const rolePriority: Record<AppRole, number> = {
  user: 0,
  manager: 1,
  admin: 2,
  developer: 3,
};

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
        .eq("user_id", userId);

      if (cancelled) return;

      const roles = (data ?? []).map((item) => item.role as AppRole);

      if (error || roles.length === 0) {
        setRole("user");
      } else {
        const highestRole = roles.reduce<AppRole>((best, current) =>
          rolePriority[current] > rolePriority[best] ? current : best,
        "user");
        setRole(highestRole);
      }
      setLoading(false);
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, authLoading]);

  const isAdminOrManager = role === "admin" || role === "manager" || role === "developer";
  const isDeveloper = role === "developer";
  const isReadOnlyUser = role === "user";

  return { role, loading, isAdminOrManager, isDeveloper, isReadOnlyUser };
};
