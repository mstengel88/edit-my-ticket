import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Rocket } from "lucide-react";

function LogViewer({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom
  if (ref.current) {
    ref.current.scrollTop = ref.current.scrollHeight;
  }

  return (
    <pre
      ref={ref}
      className="bg-muted text-foreground p-4 rounded-lg h-80 overflow-auto whitespace-pre-wrap font-mono text-xs border border-border"
    >
      {lines.length === 0 ? "Waiting for output…" : lines.join("")}
    </pre>
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartMsg, setRestartMsg] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);

  const getToken = () => session?.access_token ?? "";

  async function handleRestart() {
    setRestartLoading(true);
    setRestartMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("agent-action", {
        body: { action: "restart-winterwatch" },
      });
      if (error) throw error;
      setRestartMsg("Restart sent ✅");
    } catch (e: any) {
      setRestartMsg(`Error: ${e.message}`);
    } finally {
      setRestartLoading(false);
    }
  }

  function startStream(target: string) {
    setLines([]);
    setStreaming(true);

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/agent-stream?target=${target}`;

    const es = new EventSource(url);

    // EventSource doesn't support custom headers, so we use fetch instead
    es.close();

    // Use fetch-based SSE for auth
    const controller = new AbortController();

    fetch(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          const txt = await res.text().catch(() => "");
          setLines((p) => [...p, `[ERROR] ${res.status} ${txt}\n`]);
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Parse SSE events from buffer
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const lines2 = part.split("\n");
            let eventType = "message";
            let eventData = "";

            for (const line of lines2) {
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
            } else if (eventType === "end") {
              try {
                const d = JSON.parse(eventData);
                setLines((p) => [...p, `\n[END] code=${d.code} signal=${d.signal}\n`]);
              } catch {
                setLines((p) => [...p, `\n[END]\n`]);
              }
              setStreaming(false);
            } else if (eventType === "error") {
              setLines((p) => [...p, `\n[ERROR] ${eventData}\n`]);
              setStreaming(false);
            }
          }
        }

        setStreaming(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLines((p) => [...p, `\n[ERROR] ${err.message}\n`]);
        }
        setStreaming(false);
      });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Admin</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:px-6 space-y-8">
        {/* Restart Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Service Control</h2>
          <div className="flex items-center gap-3">
            <Button onClick={handleRestart} disabled={restartLoading} variant="destructive" className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {restartLoading ? "Restarting…" : "Restart winterwatch-live"}
            </Button>
            {restartMsg && (
              <span className="text-sm text-muted-foreground">{restartMsg}</span>
            )}
          </div>
        </section>

        {/* Deploy Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Deploy</h2>
          <div className="flex gap-3">
            <Button disabled={streaming} onClick={() => startStream("winterwatch")} className="gap-1.5">
              <Rocket className="h-4 w-4" />
              {streaming ? "Running…" : "Deploy Winterwatch"}
            </Button>
            <Button disabled={streaming} onClick={() => startStream("tickets")} variant="secondary" className="gap-1.5">
              <Rocket className="h-4 w-4" />
              {streaming ? "Running…" : "Deploy Tickets"}
            </Button>
          </div>
          <LogViewer lines={lines} />
        </section>
      </main>
    </div>
  );
};

export default Admin;
