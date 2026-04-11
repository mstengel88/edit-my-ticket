import { useState, useEffect, useRef, useCallback } from "react";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/integrations/supabase/client";
import { getAccessToken } from "@/lib/getAccessToken";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
import type { AgentKey } from "@/pages/Admin";

function fmtTime(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface DeployApp {
  key: string;
  label: string;
  repoDir: string;
}

interface DeployRecord {
  revision?: string;
  deployedAt?: string;
}

interface DeployPanelProps {
  agentKey: AgentKey;
}

export function DeployPanel({ agentKey }: DeployPanelProps) {
  const [deployApps, setDeployApps] = useState<DeployApp[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState<Record<string, string | number | null>>({});
  const [deployed, setDeployed] = useState<Record<string, DeployRecord>>({});
  const [lastResult, setLastResult] = useState<{
    app: string;
    ok: boolean;
    code: number | null;
  } | null>(null);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getAccessToken();

      return fetch(
        `${SUPABASE_URL}/functions/v1/agent-proxy?agent=${encodeURIComponent(
          agentKey,
        )}&path=${encodeURIComponent(path)}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_PUBLISHABLE_KEY,
            ...(init?.headers || {}),
          },
        },
      );
    },
    [agentKey],
  );

  const refreshDeploys = useCallback(async () => {
    try {
      const res = await authedFetch("/deploys");
      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) {
        setLines((prev) => [
          ...prev,
          `[ERROR] ${data?.error || data?.message || text || "Failed to fetch deploys"}\n`,
        ]);
        return;
      }

      setDeployApps(data?.deploys || []);
    } catch (e: any) {
      setLines((prev) => [
        ...prev,
        `[ERROR] ${e?.message || "Failed to fetch deploys"}\n`,
      ]);
    }
  }, [authedFetch]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await authedFetch("/status");
      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) return;

      setRunning(data?.running || {});
      setDeployed(data?.deployed || {});
    } catch {
      // silent
    }
  }, [authedFetch]);

  useEffect(() => {
    setLines([]);
    setLastResult(null);
    setBusyApp(null);
    refreshDeploys();
    refreshStatus();

    const t = setInterval(refreshStatus, 10_000);
    return () => clearInterval(t);
  }, [agentKey, refreshDeploys, refreshStatus]);

  async function startStream(which: string) {
    setLines([]);
    setLastResult(null);
    setBusyApp(which);

    try {
      const token = await getAccessToken();

      const url = `${SUPABASE_URL}/functions/v1/agent-stream?agent=${encodeURIComponent(
        agentKey,
      )}&target=${encodeURIComponent(which)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        setLines((p) => [...p, `[ERROR] ${res.status} ${txt}\n`]);
        setBusyApp(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const sseLines = part.split("\n");
          let eventType = "message";
          let eventData = "";

          for (const line of sseLines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) eventData += line.slice(6);
          }

          if (eventType === "start") {
            try {
              const d = JSON.parse(eventData);
              setLines((p) => [...p, `[START] ${d.action}\n`]);
            } catch {
              setLines((p) => [...p, "[START]\n"]);
            }
          } else if (eventType === "stdout" || eventType === "stderr") {
            try {
              const d = JSON.parse(eventData);
              setLines((p) => [...p, d.chunk]);
            } catch {
              setLines((p) => [...p, eventData]);
            }
          } else if (eventType === "status") {
            try {
              const d = JSON.parse(eventData);
              if (d.running) setRunning(d.running);
              if (d.deployed) setDeployed(d.deployed);
            } catch {
              // ignore
            }
          } else if (eventType === "end") {
            try {
              const d = JSON.parse(eventData);
              const ok = d.code === 0;
              setLines((p) => [...p, `\n[END] code=${d.code} signal=${d.signal}\n`]);
              setLastResult({ app: which, ok, code: d.code });
            } catch {
              setLines((p) => [...p, "\n[END]\n"]);
              setLastResult({ app: which, ok: false, code: null });
            }
            setBusyApp(null);
            refreshStatus();
          } else if (eventType === "error") {
            try {
              const d = JSON.parse(eventData);
              setLines((p) => [...p, `\n[ERROR] ${d.message}\n`]);
            } catch {
              setLines((p) => [...p, `\n[ERROR] ${eventData}\n`]);
            }
            setLastResult({ app: which, ok: false, code: null });
            setBusyApp(null);
            refreshStatus();
          }
        }
      }

      setBusyApp(null);
    } catch (err: any) {
      setLines((p) => [...p, `\n[ERROR] ${err?.message || "Deploy stream failed"}\n`]);
      setBusyApp(null);
      refreshStatus();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {deployApps.map((app, index) => {
          const locked = Boolean(running[app.key]);

          return (
            <Button
              key={app.key}
              disabled={locked || !!busyApp}
              onClick={() => startStream(app.key)}
              variant={index === 0 ? "default" : "secondary"}
              className="gap-1.5"
            >
              <Rocket className="h-4 w-4" />
              {locked ? `${app.label} Deploy Running…` : `Deploy ${app.label}`}
            </Button>
          );
        })}

        {lastResult && (
          <Badge variant={lastResult.ok ? "default" : "destructive"}>
            {lastResult.ok ? "Success" : "Failed"} {lastResult.app}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-sm">
        {deployApps.map((app) => {
          const locked = Boolean(running[app.key]);

          return (
            <div key={app.key}>
              <strong>{app.label} deployed:</strong>{" "}
              {deployed[app.key]?.revision || "—"}{" "}
              <span className="text-muted-foreground">
                ({fmtTime(deployed[app.key]?.deployedAt)})
              </span>{" "}
              {locked && <Badge variant="secondary">Deploying…</Badge>}
            </div>
          );
        })}
      </div>

      <pre
        ref={logRef}
        className="bg-muted text-foreground p-4 rounded-lg h-80 overflow-auto whitespace-pre-wrap font-mono text-xs border border-border"
      >
        {lines.length === 0 ? "Waiting for output…" : lines.join("")}
      </pre>
    </div>
  );
}