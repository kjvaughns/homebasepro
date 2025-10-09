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
import { LogOut, User, Eye, LayoutDashboard, Users, Package, MessageSquare, Settings } from "lucide-react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import homebaseLogo from "@/assets/homebase-logo.png";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Check user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        toast({
          title: "Profile not found",
          description: "Please complete registration.",
          variant: "destructive",
        });
        navigate("/register");
        return;
      }

      setUserProfile(profile);

      // Check if user is admin first - admins can view without organization
      const { data: isAdminData, error: adminError } = await supabase.rpc("is_admin");
      if (!adminError && isAdminData) {
        setIsAdmin(true);
        return;
      }

      // Check for organization - users need this to access provider area
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!orgData) {
        toast({
          title: "Setup Required",
          description: "Please complete your provider onboarding",
          variant: "destructive",
        });
        navigate("/become-provider");
        return;
      }

      setOrganization(orgData);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "PR";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isMessagesRoute = location.pathname.startsWith("/provider/messages");

  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMessagesRoute && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname, isMessagesRoute]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14">
        <div className="container flex h-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/provider/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
              <span className="hidden md:block">{organization?.name || "Provider"}</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {!isMobile && <RoleSwitcher />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(userProfile?.full_name || "")}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/provider/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
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

      {/* Main Content */}
      <main
        ref={mainRef}
        className={cn(
          "flex-1 min-h-0",
          isMessagesRoute ? "overflow-hidden" : "overflow-y-auto",
          isMobile ? "" : "pl-64"
        )}
      >
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
          <div className="flex items-center justify-around h-16">
            {mobileNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Sidebar (Desktop) */}
      {!isMobile && (
        <SidebarProvider>
          <div className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)]">
            <ProviderSidebar />
          </div>
        </SidebarProvider>
      )}
    </div>
  );
};

export default ProviderLayout;
