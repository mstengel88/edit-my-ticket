import { ReactNode, useEffect } from "react";
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
  BarChart3,
  ClipboardList,
  LogOut,
  Menu,
  MessageSquarePlus,
  Moon,
  Package,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  FileText,
} from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  headerExtra?: ReactNode;
  title?: string;
  subtitle?: string;
}

const baseNavItems = [
  { label: "Tickets", icon: FileText, href: "/", end: true },
];

const managerNavItems = [
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Products", icon: Package, href: "/products" },
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
  const { isAdminOrManager, role } = useUserRole();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isPortrait = useIsPortrait();
  const navigate = useNavigate();
  const location = useLocation();
  const useCompactLayout = isMobile || (isTablet && isPortrait);
  const currentTheme = theme === "dark" ? "dark" : "light";

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

  const navItems = [
    ...baseNavItems,
    ...(isAdminOrManager ? managerNavItems : []),
  ];

  const allNav = [
    ...navItems,
    ...(isAdminOrManager ? adminItems : []),
    ...(role === "developer" ? developerItems : []),
  ];

  return (
    <div className="safe-area-min-h safe-area-x flex w-full bg-background">
      {/* Desktop Sidebar */}
      {!useCompactLayout && (
        <aside className="sticky top-0 h-screen w-56 shrink-0 border-r bg-card flex flex-col">
          <div className="px-4 py-4 border-b">
            <h2 className="text-base font-bold tracking-tight text-foreground">Ticket Manager</h2>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-accent text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}

            {isAdminOrManager && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Management</span>
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeClassName="bg-accent text-accent-foreground"
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
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Developer</span>
                </div>
                {developerItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeClassName="bg-accent text-accent-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <div className="border-t px-2 py-3 space-y-1">
            <button
              onClick={handleThemeToggle}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {currentTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {currentTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {useCompactLayout && (
          <header className="safe-area-top sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm no-print">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h1 className="truncate text-lg font-bold tracking-tight text-foreground">{title}</h1>
                  )}
                  {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      collisionPadding={{ top: 8, right: 16, bottom: 8, left: 16 }}
                      className="w-64 max-w-[calc(100vw-var(--safe-area-left)-var(--safe-area-right)-1rem)]"
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
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <header className="safe-area-top sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm no-print">
            <div className="flex items-center justify-between gap-4 px-6 py-3">
              <div>
                {title && (
                  <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {headerExtra}
              </div>
            </div>
          </header>
        )}

        <main className="safe-area-bottom flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
