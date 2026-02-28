import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, Trash2 } from "lucide-react";

function fmtPct(n: number) { return `${Math.round(n)}%`; }

function fmtBytes(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

interface MetricsData {
  ts?: string;
  cpu: { pct: number };
  mem: { pct: number; used: number; total: number };
}

interface SeriesPoint { t: string; cpu: number; mem: number }

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

export function OpsDashboard() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData>({ cpu: { pct: 0 }, mem: { pct: 0, used: 0, total: 0 } });
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selected, setSelected] = useState("");
  const [logs, setLogs] = useState("");
  const [restartBusy, setRestartBusy] = useState<Record<string, boolean>>({});
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // Metrics polling
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("agent-metrics");
        if (!alive || error || !data) return;
        setMetrics(data);
        setSeries((prev) => {
          const next = [...prev, {
            t: new Date(data.ts).toLocaleTimeString(),
            cpu: data.cpu.pct,
            mem: data.mem.pct,
          }];
          return next.slice(-60);
        });
      } catch { /* silent */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Containers polling
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("agent-containers");
        if (!alive || error || !data) return;
        const list = data.containers || [];
        setContainers(list);
        if (!selected && list.length) setSelected(list[0].name);
      } catch { /* silent */ }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [selected]);

  // Live logs stream via SSE (needs raw fetch for streaming)
  useEffect(() => {
    if (!selected || !session?.access_token) return;
    setLogs("");

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/agent-logs-stream?container=${encodeURIComponent(selected)}`;

    const controller = new AbortController();

    fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        setLogs(`[ERROR] ${res.status} ${txt}\n`);
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
          if (eventType === "log") {
            try {
              const { chunk } = JSON.parse(eventData);
              setLogs((prev) => {
                const next = prev + chunk;
                return next.length > 200_000 ? next.slice(next.length - 200_000) : next;
              });
            } catch {
              setLogs((prev) => prev + eventData);
            }
          } else if (eventType === "error") {
            setLogs((prev) => prev + `\n[ERROR] ${eventData}\n`);
          }
        }
      }
    }).catch((err) => {
      if (err.name !== "AbortError") {
        setLogs((prev) => prev + `\n[ERROR] ${err.message}\n`);
      }
    });

    return () => controller.abort();
  }, [selected, session?.access_token]);

  const restartContainer = useCallback(async (name: string) => {
    setRestartBusy((p) => ({ ...p, [name]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("agent-container-restart", {
        body: { id: name },
      });
      if (error) alert(error.message || "Restart failed");
    } finally {
      setRestartBusy((p) => ({ ...p, [name]: false }));
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* CPU & RAM charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">CPU</span>
            <span className="text-sm text-muted-foreground">{fmtPct(metrics.cpu?.pct ?? 0)}</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Line type="monotone" dataKey="cpu" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">RAM</span>
            <span className="text-sm text-muted-foreground">
              {fmtPct(metrics.mem?.pct ?? 0)} ({fmtBytes(metrics.mem?.used ?? 0)} / {fmtBytes(metrics.mem?.total ?? 0)})
            </span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Line type="monotone" dataKey="mem" dot={false} stroke="hsl(var(--accent))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Containers table */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Containers</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Logs:</span>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Select container" />
              </SelectTrigger>
              <SelectContent>
                {containers.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.image}</TableCell>
                  <TableCell>
                    <Badge variant={c.state === "running" ? "default" : "destructive"}>
                      {c.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.status}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7 text-xs"
                      onClick={() => restartContainer(c.name)}
                      disabled={!!restartBusy[c.name]}
                    >
                      <RotateCcw className="h-3 w-3" />
                      {restartBusy[c.name] ? "Restarting…" : "Restart"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!containers.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No containers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Live logs */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-foreground">
            Live Logs: {selected || "—"}
          </span>
          <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => setLogs("")}>
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        </div>
        <pre
          ref={logRef}
          className="bg-muted text-foreground p-4 rounded-lg h-80 overflow-auto whitespace-pre-wrap font-mono text-xs border border-border"
        >
          {logs || "Waiting for logs…"}
        </pre>
      </div>
    </div>
  );
}
