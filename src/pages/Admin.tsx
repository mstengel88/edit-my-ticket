import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { DeployPanel } from "@/components/DeployPanel";
import { useState } from "react";

const Admin = () => {
  const navigate = useNavigate();
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
          <DeployPanel />
        </section>
      </main>
    </div>
  );
};

export default Admin;
