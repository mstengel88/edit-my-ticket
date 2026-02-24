import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useUserRole";

interface UserWithRole {
  userId: string;
  email: string;
  displayName: string | null;
  role: AppRole;
}

export function UserRolesManager() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch profiles and roles
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    // Build user list from roles (every user should have a role)
    const roleMap = new Map(roles.map((r) => [r.user_id, r.role as AppRole]));
    const profileMap = new Map(profiles.map((p) => [p.user_id, p.display_name]));

    // Merge: use all unique user_ids from both
    const allUserIds = new Set([...roleMap.keys(), ...profileMap.keys()]);
    const merged: UserWithRole[] = Array.from(allUserIds).map((uid) => ({
      userId: uid,
      email: profileMap.get(uid) || uid, // display_name often holds the email
      displayName: profileMap.get(uid) || null,
      role: roleMap.get(uid) || "user",
    }));

    // Sort: admins first, then managers, then users
    const order: Record<AppRole, number> = { admin: 0, manager: 1, user: 2 };
    merged.sort((a, b) => order[a.role] - order[b.role]);

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // Prevent changing own role
    if (userId === session?.user?.id) {
      toast.error("You can't change your own role");
      return;
    }

    setUpdating(userId);

    // Delete existing role, insert new one
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (delErr) {
      toast.error("Failed to update role");
      setUpdating(null);
      return;
    }

    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (insErr) {
      toast.error("Failed to update role");
      setUpdating(null);
      return;
    }

    toast.success("Role updated");
    setUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, role: newRole } : u))
    );
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roleBadgeColor: Record<AppRole, string> = {
    admin: "bg-destructive/10 text-destructive border-destructive/20",
    manager: "bg-primary/10 text-primary border-primary/20",
    user: "bg-muted text-muted-foreground",
  };

  return (
    <div className="max-w-lg space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Admins can see and edit everything. Managers can see and edit everything. Users can only view tickets and reports.
      </p>
      {users.map((user) => {
        const isSelf = user.userId === session?.user?.id;
        return (
          <div
            key={user.userId}
            className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-3">
              <span className="text-sm font-medium text-foreground truncate">
                {user.displayName || "Unknown"}
                {isSelf && (
                  <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isSelf ? (
                <Badge variant="outline" className={roleBadgeColor[user.role]}>
                  {user.role}
                </Badge>
              ) : (
                <Select
                  value={user.role}
                  onValueChange={(val) => handleRoleChange(user.userId, val as AppRole)}
                  disabled={!!updating}
                >
                  <SelectTrigger className="w-[120px] bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {updating === user.userId && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
