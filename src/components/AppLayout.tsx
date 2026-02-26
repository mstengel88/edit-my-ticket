import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
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

const navItems = [
  { label: "Tickets", icon: FileText, href: "/", end: true },
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
  const { signOut } = useAuth();
  const { isAdminOrManager, role } = useUserRole();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const allNav = [
    ...navItems,
    ...(isAdminOrManager ? adminItems : []),
    ...(role === "developer" ? developerItems : []),
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
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
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
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
        {isMobile && (
          <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm no-print">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                {title && (
                  <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                {headerExtra}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {allNav.map((item) => (
                      <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                      {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
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
          </header>
        )}

        {/* Desktop header (minimal, for page-specific actions) */}
        {!isMobile && (title || headerExtra) && (
          <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm no-print">
            <div className="flex items-center justify-between px-6 py-3">
              <div>
                {title && (
                  <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                {headerExtra}
              </div>
            </div>
          </header>
        )}

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
