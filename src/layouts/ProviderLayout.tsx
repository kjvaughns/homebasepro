import { useEffect, useState, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProviderSidebar } from "@/components/ProviderSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User,
  Eye,
  LayoutDashboard,
  Users,
  Package,
  MessageSquare,
  Settings,
  DollarSign,
  BarChart3,
  Receipt,
  UserPlus,
} from "lucide-react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import homebaseLogo from "@/assets/homebase-logo.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";

// --- Mobile bottom nav (icons + label) content height ---
const TABBAR_H = 80;

const mobileNavigation = [
  { name: "Overview", href: "/provider/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/provider/clients", icon: Users },
  { name: "Plans", href: "/provider/plans", icon: Package },
  { name: "Messages", href: "/provider/messages", icon: MessageSquare },
  { name: "Settings", href: "/provider/settings", icon: Settings },
];

const ProviderLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [organization, setOrganization] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const isMessagesRoute = location.pathname.startsWith("/provider/messages");
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        toast({ title: "Profile not found", description: "Please complete registration.", variant: "destructive" });
        navigate("/register");
        return;
      }
      setUserProfile(profile);

      const { data: admin } = await supabase.rpc("is_admin");
      if (admin) {
        setIsAdmin(true);
        return;
      }

      const { data: org } = await supabase.from("organizations").select("*").eq("owner_id", user.id).maybeSingle();

      if (!org) {
        toast({
          title: "Setup Required",
          description: "Please complete your provider onboarding",
          variant: "destructive",
        });
        navigate("/become-provider");
        return;
      }
      setOrganization(org);
    };
    load();
  }, [navigate, toast]);

  useEffect(() => {
    if (!isMessagesRoute && mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname, isMessagesRoute]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully" });
    navigate("/");
  };

  const getInitials = (name: string) =>
    !name
      ? "PR"
      : name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

  // -------------------- MOBILE --------------------
  if (isMobile) {
    return (
      <div className="min-h-[100svh] overflow-hidden bg-background flex flex-col">
        {/* Header (56px) */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14">
          <div className="container flex h-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/provider/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
                <span className="hidden md:block">{organization?.name || "Provider"}</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url || ""} />
                      <AvatarFallback>{getInitials(userProfile?.full_name || "")}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                  <DropdownMenuItem onClick={() => navigate("/provider/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/provider/analytics")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Analytics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/provider/accounting")}>
                    <Receipt className="mr-2 h-4 w-4" />
                    <span>Accounting</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/provider/payroll")}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Payroll</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/provider/team")}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Team</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/provider/settings")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Admin Portal</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main — scroller between header and tab bar */}
        <main
          ref={mainRef}
          className={cn(isMessagesRoute ? "overflow-hidden" : "overflow-y-auto")}
          style={{
            height: `calc(100svh - 56px - (${TABBAR_H}px + env(safe-area-inset-bottom)))`,
            paddingBottom: 12, // tiny breathing room
          }}
        >
          <Outlet />
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card"
          style={{
            height: `calc(${TABBAR_H}px + env(safe-area-inset-bottom))`,
            paddingBottom: "env(safe-area-inset-bottom)",
            borderTop: "1px solid hsl(0 0% 93%)",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-around" style={{ height: `${TABBAR_H}px` }}>
            {mobileNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-start gap-1 transition-colors min-w-0 flex-1",
                    isActive ? "text-primary" : "text-[hsl(0_0%_70%)] hover:text-foreground",
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[11.5px] font-medium leading-tight">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Floating AI Assistant */}
        <FloatingAIAssistant 
          userRole="provider"
          context={{ userId: userProfile?.user_id, orgId: organization?.id }}
        />
      </div>
    );
  }

  // -------------------- DESKTOP --------------------
  return (
    <>
      {/* Header (56px) */}
      <header
        id="provider-topbar"
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14"
      >
        <div className="container flex h-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/provider/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
              <span className="hidden md:block">{organization?.name || "Provider"}</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <RoleSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(userProfile?.full_name || "")}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                <DropdownMenuItem onClick={() => navigate("/provider/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/provider/analytics")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Analytics</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/provider/accounting")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  <span>Accounting</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/provider/payroll")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>Payroll</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/provider/team")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Team</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/provider/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Admin Portal</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar + Main fixed layout */}
      <div className="fixed left-0 top-14 right-0 bottom-0 grid" style={{ gridTemplateColumns: "16rem 1fr" }}>
        <SidebarProvider>
          <aside className="border-r overflow-y-auto">
            <ProviderSidebar />
          </aside>
        </SidebarProvider>

        <main
          ref={mainRef}
          className={cn(isMessagesRoute ? "overflow-hidden" : "overflow-y-auto")}
          style={{ height: "calc(100vh - 56px)" }}
        >
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant 
        userRole="provider"
        context={{ userId: userProfile?.user_id, orgId: organization?.id }}
      />
    </>
  );
};

export default ProviderLayout;
