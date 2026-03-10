import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { DeployPanel } from "@/components/DeployPanel";
import { OpsDashboard } from "@/components/OpsDashboard";
import { AppLayout } from "@/components/AppLayout";
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { getAccessToken } from "@/lib/getAccessToken";

const Admin = () => {
  const [authReady, setAuthReady] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartMsg, setRestartMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(() => {
      if (mounted) setAuthReady(true);
    });

    (window as any).__dbg_get_session = () => supabase.auth.getSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleRestart() {
    setRestartLoading(true);
    setRestartMsg("");

    try {
      const token = await getAccessToken();

      const url = `${SUPABASE_URL}/functions/v1/agent-proxy?path=${encodeURIComponent(
        "/container/winterwatch-live/restart",
      )}`;

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
        throw new Error(bodyJson?.error || bodyJson?.message || bodyText || "Restart failed");
      }

      setRestartMsg("Restart sent ✅");
    } catch (e: any) {
      setRestartMsg(`Error: ${e?.message || "Restart failed"}`);
    } finally {
      setRestartLoading(false);
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
          <h2 className="text-sm font-semibold text-foreground">Server Metrics</h2>
          <OpsDashboard />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Service Control</h2>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRestart}
              disabled={restartLoading}
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
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Deploy</h2>
          <DeployPanel />
        </section>
      </div>
    </AppLayout>
  );
};

export default Admin;