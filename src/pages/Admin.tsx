import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, RefreshCw } from "lucide-react";
import { DeployPanel } from "@/components/DeployPanel";
import { OpsDashboard } from "@/components/OpsDashboard";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import {
  supabase,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/integrations/supabase/client";
import { getAccessToken } from "@/lib/getAccessToken";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Admin = () => {
  const [authReady, setAuthReady] = useState(false);
  const [agentKey, setAgentKey] = useState<string>("");

  const [restartLoading, setRestartLoading] = useState(false);
  const [restartMsg, setRestartMsg] = useState("");

  const [agentRestartLoading, setAgentRestartLoading] = useState(false);
  const [agentRestartMsg, setAgentRestartMsg] = useState("");
  const [agentNotice, setAgentNotice] = useState("");
  const {
    data: registry,
    isLoading: registryLoading,
    error: registryError,
  } = useAgentRegistry(authReady);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await supabase.auth.getSession();
        await getAccessToken();
        if (mounted) setAuthReady(true);
      } catch {
        if (mounted) setAuthReady(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const agents = registry?.agents || [];
    if (!agents.length) return;

    const preferredAgent =
      agents.find((agent) => agent.key === registry?.preferredAgentKey) || agents[0];
    const selected = agents.find((agent) => agent.key === agentKey);

    if (!selected) {
      setAgentKey(preferredAgent.key);
      setAgentNotice("");
      return;
    }

    if (!selected.health.ok && preferredAgent.key !== selected.key && preferredAgent.health.ok) {
      setAgentKey(preferredAgent.key);
      setAgentNotice(`Switched to ${preferredAgent.label} because ${selected.label} is unhealthy.`);
      return;
    }

    setAgentNotice("");
  }, [registry, agentKey]);

  const selectedAgent =
    registry?.agents.find((agent) => agent.key === agentKey) || null;

  async function postToAgentProxy(path: string) {
    const token = await getAccessToken();

    const url = `${SUPABASE_URL}/functions/v1/agent-proxy?agent=${encodeURIComponent(
      agentKey,
    )}&path=${encodeURIComponent(path)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const bodyText = await res.text();
    let bodyJson: any = null;

    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      bodyJson = null;
    }

    if (!res.ok) {
      throw new Error(
        bodyJson?.error || bodyJson?.message || bodyText || "Request failed",
      );
    }

    return bodyJson;
  }

  async function handleRestart() {
    setRestartLoading(true);
    setRestartMsg("");

    try {
      await postToAgentProxy("/container/winterwatch-live/restart");
      setRestartMsg("Restart sent ✅");
    } catch (e: any) {
      setRestartMsg(`Error: ${e?.message || "Restart failed"}`);
    } finally {
      setRestartLoading(false);
    }
  }

  async function handleAgentRestart() {
    setAgentRestartLoading(true);
    setAgentRestartMsg("");

    try {
      await postToAgentProxy("/service/agent/restart");
      setAgentRestartMsg("Agent restart scheduled ✅");
    } catch (e: any) {
      setAgentRestartMsg(`Error: ${e?.message || "Agent restart failed"}`);
    } finally {
      setAgentRestartLoading(false);
    }
  }

  if (!authReady) {
    return (
      <AppLayout title="Admin">
        <div className="container mx-auto px-4 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading admin session…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin">
      <div className="container mx-auto px-4 py-6 sm:px-6 space-y-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Server Metrics</h2>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Server:</span>
              <Select
                value={agentKey}
                onValueChange={setAgentKey}
                disabled={registryLoading || !registry?.agents.length}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {(registry?.agents || []).map((agent) => (
                    <SelectItem key={agent.key} value={agent.key}>
                      {agent.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {selectedAgent ? (
              <>
                <Badge variant={selectedAgent.health.ok ? "default" : "destructive"}>
                  {selectedAgent.health.ok ? "Healthy" : "Degraded"}
                </Badge>
                <span className="text-muted-foreground">
                  {selectedAgent.label}
                  {selectedAgent.health.responseTimeMs != null
                    ? ` • ${selectedAgent.health.responseTimeMs}ms`
                    : ""}
                </span>
                {!selectedAgent.health.ok && selectedAgent.health.error && (
                  <span className="text-destructive">{selectedAgent.health.error}</span>
                )}
              </>
            ) : registryError ? (
              <span className="text-destructive">
                {registryError instanceof Error
                  ? registryError.message
                  : "Failed to load agent registry"}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {registryLoading ? "Loading servers…" : "No active servers configured"}
              </span>
            )}
          </div>

          {agentNotice && (
            <p className="text-sm text-muted-foreground">{agentNotice}</p>
          )}

          <OpsDashboard agentKey={agentKey} authReady={authReady} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Service Control</h2>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRestart}
              disabled={restartLoading || !selectedAgent}
              variant="destructive"
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              {restartLoading ? "Restarting…" : "Restart winterwatch-live"}
            </Button>

            {restartMsg && (
              <span className="text-sm text-muted-foreground">{restartMsg}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleAgentRestart}
              disabled={agentRestartLoading || !selectedAgent}
              variant="secondary"
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              {agentRestartLoading ? "Restarting agent…" : "Restart docker-agent service"}
            </Button>

            {agentRestartMsg && (
              <span className="text-sm text-muted-foreground">{agentRestartMsg}</span>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Deploy</h2>
          <DeployPanel agentKey={agentKey} authReady={authReady} />
        </section>
      </div>
    </AppLayout>
  );
};

export default Admin;
