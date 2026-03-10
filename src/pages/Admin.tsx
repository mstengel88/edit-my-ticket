import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { DeployPanel } from "@/components/DeployPanel";
import { OpsDashboard } from "@/components/OpsDashboard";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartMsg, setRestartMsg] = useState("");

  async function handleRestart() {
    setRestartLoading(true);
    setRestartMsg("");

    try {
      const { data, error } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (error || !token) {
        throw new Error("No valid session");
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/agent-proxy?path=${encodeURIComponent("/container/winterwatch-live/restart")}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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