import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user_id: string;
  user_display_name?: string;
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  sync: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sign_in: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  sign_out: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "-";
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

const AuditLog = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs" as any)
      .select("*, profiles!audit_logs_user_id_fkey(display_name)" as any)
      .order("created_at", { ascending: false })
      .limit(200);

    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);

    const { data, error } = await query;
    if (error) console.error("Audit fetch error:", error);

    const entries = ((data as any[]) ?? []).map((row: any) => ({
      ...row,
      user_display_name: row.profiles?.display_name ?? row.user_id,
    }));
    setLogs(entries as AuditEntry[]);
    setLoading(false);
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Audit Log</h1>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Action</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="sync">Sync</SelectItem>
                    <SelectItem value="sign_in">Sign In</SelectItem>
                    <SelectItem value="sign_out">Sign Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Entity</label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ticket">Ticket</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="user_role">User Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                 <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>User</TableHead>
                   <TableHead>Action</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Entity ID</TableHead>
                   <TableHead>Details</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-12">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                     </TableCell>
                   </TableRow>
                 ) : logs.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                       No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                     <TableCell className="whitespace-nowrap text-sm">{formatDate(log.created_at)}</TableCell>
                     <TableCell className="text-sm truncate max-w-[150px]">{log.user_display_name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={actionColors[log.action] ?? ""}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{log.entity_type}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground max-w-[120px] truncate">
                        {log.entity_id ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                        {formatDetails(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AuditLog;
