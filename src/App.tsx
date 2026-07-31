import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw, X } from "lucide-react";
import companyLogo from "@/assets/Greenhillssupply_logo.png";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Admin = lazy(() => import("./pages/Admin"));
const Customers = lazy(() => import("./pages/Customers"));
const Orders = lazy(() => import("./pages/Orders"));
const Products = lazy(() => import("./pages/Products"));
const Trucks = lazy(() => import("./pages/Trucks"));
const Feedback = lazy(() => import("./pages/Feedback"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const UserRoles = lazy(() => import("./pages/UserRoles"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const MailReader = lazy(() => import("./features/mail-reader/MailReader"));

const AppSplash = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0d1522] px-6">
    <div className="flex flex-col items-center gap-5 text-center">
      <img
        src={companyLogo}
        alt="Ticket Creator"
        className="w-full max-w-[240px] object-contain"
      />
      <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
    </div>
  </div>
);

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

const PwaBanner = ({
  mode,
  onInstall,
  onUpdate,
  onDismiss,
}: {
  mode: "install" | "update";
  onInstall: () => void;
  onUpdate: () => void;
  onDismiss: () => void;
}) => (
  <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
    <div className="w-full max-w-xl rounded-2xl border border-cyan-300/20 bg-[#0f1b2d]/95 px-4 py-4 text-white shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            {mode === "install" ? "Install App" : "Update Ready"}
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {mode === "install"
              ? "Add Ticket Creator to your device for faster access."
              : "A newer version of Ticket Creator is ready to use."}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {mode === "install"
              ? "Install the app to launch it from your home screen and use it like a standalone app."
              : "Refresh into the latest version to pick up the newest fixes and features."}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss PWA banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "install" ? (
          <Button onClick={onInstall} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <Download className="h-4 w-4" />
            Install App
          </Button>
        ) : (
          <Button onClick={onUpdate} className="gap-1.5 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <RefreshCw className="h-4 w-4" />
            Update Now
          </Button>
        )}
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <AppSplash />;
  }

  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { isAdminOrManager, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <AppSplash />;
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdminOrManager) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const TemplateAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <AppSplash />;
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DeveloperRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { isDeveloper, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <AppSplash />;
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isDeveloper) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <AppSplash />;
  }

  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setShowInstallBanner(false);
    };

    const handleUpdateReady = (event: Event) => {
      const registration = (event as CustomEvent<ServiceWorkerRegistration>).detail;
      if (!registration?.waiting) return;
      setUpdateRegistration(registration);
      setShowUpdateBanner(true);
    };

    const handleControllerChange = () => {
      window.location.reload();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("pwa:update-ready", handleUpdateReady as EventListener);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pwa:update-ready", handleUpdateReady as EventListener);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPromptEvent(null);
    }
  };

  const handleUpdate = () => {
    if (!updateRegistration?.waiting) return;
    updateRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="ticket-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showInstallBanner && !showUpdateBanner && (
            <PwaBanner
              mode="install"
              onInstall={() => void handleInstall()}
              onUpdate={() => {}}
              onDismiss={() => setShowInstallBanner(false)}
            />
          )}
          {showUpdateBanner && (
            <PwaBanner
              mode="update"
              onInstall={() => {}}
              onUpdate={handleUpdate}
              onDismiss={() => setShowUpdateBanner(false)}
            />
          )}
          <BrowserRouter>
            <Suspense fallback={<AppSplash />}>
              <Routes>
                <Route path="/mail-reader" element={<MailReader />} />
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/support" element={<Support />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/billable" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/settings" element={<TemplateAdminRoute><Settings /></TemplateAdminRoute>} />
                <Route path="/loadrite-setup" element={<TemplateAdminRoute><Settings defaultTab="loadrite" /></TemplateAdminRoute>} />
                <Route path="/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />
                <Route path="/admin" element={<DeveloperRoute><Admin /></DeveloperRoute>} />
                <Route path="/customers" element={<AdminRoute><Customers /></AdminRoute>} />
                <Route path="/orders" element={<AdminRoute><Orders /></AdminRoute>} />
                <Route path="/products" element={<AdminRoute><Products /></AdminRoute>} />
                <Route path="/trucks" element={<AdminRoute><Trucks /></AdminRoute>} />
                <Route path="/feedback" element={<AdminRoute><Feedback /></AdminRoute>} />
                <Route path="/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
                <Route path="/user-roles" element={<AdminRoute><UserRoles /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
