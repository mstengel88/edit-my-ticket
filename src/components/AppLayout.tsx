import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "next-themes";
import { useIsMobile, useIsTablet, useIsPortrait } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart3,
  ClipboardList,
  Home,
  FolderKanban,
  Loader2,
  LogOut,
  Menu,
  MessageSquarePlus,
  Moon,
  Package,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Truck,
  Users,
  FileText,
} from "lucide-react";
import companyLogo from "@/assets/Greenhillssupply_logo.png";
import { toast } from "sonner";

interface AppLayoutProps {
  children: ReactNode;
  headerExtra?: ReactNode;
  title?: string;
  subtitle?: string;
}

const baseNavItems = [
  { label: "Home", icon: Home, href: "/home" },
  { label: "Tickets", icon: FileText, href: "/", end: true },
];

const managerNavItems = [
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Orders", icon: FolderKanban, href: "/orders" },
  { label: "Products", icon: Package, href: "/products" },
  { label: "Trucks", icon: Truck, href: "/trucks" },
  { label: "Feedback", icon: MessageSquarePlus, href: "/feedback" },
];

const adminItems = [
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "User Roles", icon: Users, href: "/user-roles" },
  { label: "Audit Log", icon: ClipboardList, href: "/audit-log" },
];

const developerItems = [
  { label: "Admin", icon: ShieldCheck, href: "/admin" },
];

export function AppLayout({ children, headerExtra, title, subtitle }: AppLayoutProps) {
  const { signOut, session } = useAuth();
  const { isAdminOrManager, isAdmin, role } = useUserRole();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isPortrait = useIsPortrait();
  const navigate = useNavigate();
  const location = useLocation();
  const useCompactLayout = isMobile || (isTablet && isPortrait);
  const currentTheme = theme === "dark" ? "dark" : "light";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const desktopShellInset = !useCompactLayout && !isPortrait
    ? "max(12px, var(--safe-area-left), var(--safe-area-right))"
    : undefined;

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    const loadThemePreference = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled || error || !data?.theme_preference) return;
      if (data.theme_preference !== currentTheme) {
        setTheme(data.theme_preference);
      }
    };

    loadThemePreference();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, setTheme]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

    const isDark = currentTheme === "dark";

    void Promise.allSettled([
      StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark }),
      StatusBar.setBackgroundColor({ color: isDark ? "#0f172a" : "#F2F7F5" }),
    ]);
  }, [currentTheme]);

  const handleThemeToggle = async () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (!session?.user?.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ theme_preference: nextTheme })
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to save theme preference", error);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: {},
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Your account has been deleted.");

      try {
        await signOut();
      } catch (signOutError) {
        console.warn("Sign out after account deletion failed", signOutError);
      }

      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Delete account failed", error);
      const message = error instanceof Error ? error.message : "Failed to delete account";
      toast.error(message);
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  const navItems = [
    ...baseNavItems,
    ...(isAdminOrManager ? managerNavItems : []),
  ];

  const allNav = [
    ...navItems,
    ...(isAdmin ? adminItems : []),
    ...(role === "developer" ? developerItems : []),
  ];
  const compactQuickNav = allNav.filter((item) =>
    ["/home", "/", "/reports", "/customers", "/orders"].includes(item.href),
  );

  return (
    <div
      className="safe-area-min-h safe-area-x flex w-full bg-[radial-gradient(circle_at_top,_hsl(215_52%_18%)_0%,_hsl(var(--background))_38%,_hsl(var(--background))_100%)]"
      style={
        desktopShellInset
          ? {
              paddingLeft: desktopShellInset,
              paddingRight: desktopShellInset,
            }
          : undefined
      }
    >
      {/* Desktop Sidebar */}
      {!useCompactLayout && (
        <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-white/10 bg-[#0b1524] text-slate-100 flex flex-col shadow-2xl shadow-black/25">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <img
                src={companyLogo}
                alt="Ticket Creator"
                className="h-10 w-10 rounded-xl border border-cyan-300/15 bg-cyan-400/10 object-contain p-1 ring-1 ring-cyan-300/20"
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Green Hills</p>
                <h2 className="text-lg font-semibold tracking-tight text-white">Ticket Creator</h2>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                activeClassName="bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Management</span>
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                    activeClassName="bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}

            {role === "developer" && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Developer</span>
                </div>
                {developerItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                    activeClassName="bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <div className="mt-auto border-t border-white/10 px-3 py-4 space-y-1.5">
            <button
              onClick={handleThemeToggle}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {currentTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {currentTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-400/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-400/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </div>
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {useCompactLayout && (
          <header className="safe-area-top sticky top-0 z-10 border-b border-white/10 bg-[#0b1524]/95 backdrop-blur-sm no-print">
            <div className="px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2.5">
                    <img
                      src={companyLogo}
                      alt="Ticket Creator"
                      className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 object-contain p-1 shadow-lg shadow-black/20"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Green Hills
                      </p>
                      <p className="truncate text-sm font-semibold text-white">Ticket Creator</p>
                    </div>
                  </div>
                  {title && (
                    <h1 className="truncate text-lg font-bold tracking-tight text-white">{title}</h1>
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-400">{subtitle}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      collisionPadding={{ top: 8, right: 16, bottom: 8, left: 16 }}
                      className="w-64 max-w-[calc(100vw-var(--safe-area-left)-var(--safe-area-right)-1rem)] border-white/10 bg-[#132135] text-slate-100"
                    >
                      {allNav.map((item) => (
                        <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleThemeToggle}>
                        {currentTheme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                        {currentTheme === "dark" ? "Light Mode" : "Dark Mode"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-rose-300 focus:text-rose-100"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-2">
                  {compactQuickNav.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.end}
                      className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                      activeClassName="border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              {headerExtra && (
                <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="min-w-max">{headerExtra}</div>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Desktop header (minimal, for page-specific actions) */}
        {!useCompactLayout && (title || headerExtra) && (
          <header className="safe-area-top sticky top-0 z-10 border-b border-white/10 bg-[#0f1b2d]/88 backdrop-blur-sm no-print">
            <div className="flex items-center justify-between gap-4 px-6 py-3">
              <div>
                {title && (
                  <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-400">{subtitle}</p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {headerExtra}
              </div>
            </div>
          </header>
        )}

        <main className="safe-area-bottom flex-1 bg-[#0d1522] pb-[max(1rem,var(--safe-area-bottom))]">
          {children}
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and removes your app data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
              disabled={deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
