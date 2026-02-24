import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "manager" | "user";

export const useUserRole = () => {
  const { session } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      if (error || !data) {
        setRole("user"); // default fallback
      } else {
        setRole(data.role as AppRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [session?.user?.id]);

  const isAdminOrManager = role === "admin" || role === "manager";

  return { role, loading, isAdminOrManager };
};
