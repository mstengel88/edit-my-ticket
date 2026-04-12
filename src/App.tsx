import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Admin = lazy(() => import("./pages/Admin"));
const Customers = lazy(() => import("./pages/Customers"));
const Products = lazy(() => import("./pages/Products"));
const Feedback = lazy(() => import("./pages/Feedback"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const UserRoles = lazy(() => import("./pages/UserRoles"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const MailReader = lazy(() => import("./features/mail-reader/MailReader"));

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { isAdminOrManager, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdminOrManager) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DeveloperRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { isDeveloper, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isDeveloper) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ticket-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/mail-reader" element={<MailReader />} />
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
            <Route path="/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />
            <Route path="/admin" element={<DeveloperRoute><Admin /></DeveloperRoute>} />
            <Route path="/customers" element={<AdminRoute><Customers /></AdminRoute>} />
            <Route path="/products" element={<AdminRoute><Products /></AdminRoute>} />
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

export default App;
