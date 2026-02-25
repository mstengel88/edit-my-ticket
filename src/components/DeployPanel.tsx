import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";

function fmtTime(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface DeployStatus {
  running: Record<string, string>;
  deployed: Record<string, { revision?: string; deployedAt?: string }>;
}

export function DeployPanel() {
  const { session } = useAuth();
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState<Record<string, string>>({});
  const [deployed, setDeployed] = useState<Record<string, { revision?: string; deployedAt?: string }>>({});
  const [lastResult, setLastResult] = useState<{ app: string; ok: boolean; code: number | null } | null>(null);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  const refreshStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("agent-status");
      if (!error && data) {
        setRunning(data.running || {});
        setDeployed(data.deployed || {});
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const t = setInterval(refreshStatus, 10_000);
    return () => clearInterval(t);
  }, [refreshStatus]);

  function startStream(which: string) {
    setLines([]);
    setLastResult(null);
    setBusyApp(which);

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/agent-stream?target=${which}`;

    const controller = new AbortController();

    fetch(url, {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
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
              else if (line.startsWith("data: ")) eventData = line.slice(6);
            }

            if (eventType === "start") {
              try {
                const d = JSON.parse(eventData);
                setLines((p) => [...p, `[START] ${d.action}\n`]);
              } catch {
                setLines((p) => [...p, `[START]\n`]);
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
                setLines((p) => [...p, `\n[END]\n`]);
                setLastResult({ app: which, ok: false, code: null });
              }
              setBusyApp(null);
              refreshStatus();
            } else if (eventType === "error") {
              setLines((p) => [...p, `\n[ERROR] ${eventData}\n`]);
              setLastResult({ app: which, ok: false, code: null });
              setBusyApp(null);
              refreshStatus();
            }
          }
        }

        setBusyApp(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLines((p) => [...p, `\n[ERROR] ${err.message}\n`]);
        }
        setBusyApp(null);
        refreshStatus();
      });
  }

  const winterLocked = Boolean(running.winterwatch);
  const ticketsLocked = Boolean(running.tickets);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={winterLocked || !!busyApp}
          onClick={() => startStream("winterwatch")}
          className="gap-1.5"
        >
          <Rocket className="h-4 w-4" />
          {winterLocked ? "Winterwatch Deploy Running…" : "Deploy Winterwatch"}
        </Button>
        <Button
          disabled={ticketsLocked || !!busyApp}
          onClick={() => startStream("tickets")}
          variant="secondary"
          className="gap-1.5"
        >
          <Rocket className="h-4 w-4" />
          {ticketsLocked ? "Tickets Deploy Running…" : "Deploy Tickets"}
        </Button>
        {lastResult && (
          <Badge variant={lastResult.ok ? "default" : "destructive"}>
            {lastResult.ok ? "Success" : "Failed"} {lastResult.app}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div>
          <strong>Winterwatch deployed:</strong>{" "}
          {deployed.winterwatch?.revision || "—"}{" "}
          <span className="text-muted-foreground">({fmtTime(deployed.winterwatch?.deployedAt)})</span>{" "}
          {winterLocked && <Badge variant="secondary">Deploying…</Badge>}
        </div>
        <div>
          <strong>Tickets deployed:</strong>{" "}
          {deployed.tickets?.revision || "—"}{" "}
          <span className="text-muted-foreground">({fmtTime(deployed.tickets?.deployedAt)})</span>{" "}
          {ticketsLocked && <Badge variant="secondary">Deploying…</Badge>}
        </div>
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
