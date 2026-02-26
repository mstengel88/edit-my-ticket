import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { DeployPanel } from "@/components/DeployPanel";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";

const Admin = () => {
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartMsg, setRestartMsg] = useState("");

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

  return (
    <AppLayout title="Admin">
      <div className="container mx-auto px-4 py-6 sm:px-6 space-y-8">
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

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Deploy</h2>
          <DeployPanel />
        </section>
      </div>
    </AppLayout>
  );
};

export default Admin;
