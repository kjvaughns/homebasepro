import { useState, useEffect, useRef } from "react";
import {
  Home,
  Search,
  Calendar,
  Settings,
  MessageSquare,
  User,
  LogOut,
  Eye,
  Building2,
  DollarSign,
  Users,
  FileText,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import homebaseLogo from "@/assets/homebase-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SupportDrawer } from "@/components/support/SupportDrawer";
import { useMessaging } from "@/contexts/MessagingContext";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Bell } from "lucide-react";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useAutoScrollToInput } from "@/hooks/useAutoScrollToInput";

  const mobileNavigation = [
    { name: "Home", href: "/homeowner/dashboard", icon: Home },
    { name: "Explore", href: "/homeowner/browse", icon: Search },
    { name: "Appointments", href: "/homeowner/appointments", icon: Calendar },
    { name: "Providers", href: "/homeowner/providers", icon: Users },
    { name: "Messages", href: "/homeowner/messages", icon: MessageSquare },
  ];

  const desktopNavigation = [
    { name: "Home", href: "/homeowner/dashboard", icon: Home },
    { name: "Properties", href: "/homeowner/homes", icon: Building2 },
    { name: "Explore", href: "/homeowner/browse", icon: Search },
    { name: "My Providers", href: "/homeowner/providers", icon: Users },
    { name: "Appointments", href: "/homeowner/appointments", icon: Calendar },
    { name: "Messages", href: "/homeowner/messages", icon: MessageSquare },
    { name: "Settings", href: "/homeowner/settings", icon: Settings },
  ];

// bottom tab bar content height (icons + label)
const TABBAR_H = 80;

export default function HomeownerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMessagesPage = location.pathname.startsWith('/homeowner/messages');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { totalUnread } = useMessaging();
  const keyboardHeight = useKeyboardHeight();
  useAutoScrollToInput();

  useEffect(() => {
    const checkUser = async () => {
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
      if (profile.user_type !== "homeowner") {
        toast({ title: "Access denied", description: "This area is for homeowners only.", variant: "destructive" });
        navigate("/provider/dashboard");
        return;
      }

      setUserProfile(profile);
      const { data } = await supabase.rpc("is_admin");
      setIsAdmin(data || false);
    };
    checkUser();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully" });
    navigate("/");
  };

  const getInitials = (name: string) =>
    !name
      ? "HO"
      : name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

  const isMessagesRoute = location.pathname.startsWith("/homeowner/messages");
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMessagesRoute && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname, isMessagesRoute]);

  return (
    <TutorialProvider role="homeowner">
    <div className="min-h-[100svh] overflow-hidden bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14">
        <div className="container flex h-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/homeowner/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
              HomeBase
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {!isMobile && <RoleSwitcher />}
            <NotificationCenter />
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
                <DropdownMenuItem onClick={() => navigate("/homeowner/notifications")}>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/homeowner/dashboard")}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/homeowner/appointments")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Appointments</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/homeowner/homes")}>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Properties</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/homeowner/subscriptions")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>Subscriptions</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/homeowner/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Admin Portal</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <SupportDrawer />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main — scroller bounded between header and tab bar */}
      <main
        ref={mainRef}
        className={cn(
          isMobile ? "overflow-y-auto" : "overflow-y-auto h-[calc(100svh-3.5rem)] pl-64",
          isMessagesRoute ? "overflow-hidden" : "",
        )}
        style={
          isMobile
            ? {
                // viewport minus header minus (tabbar + safe area) minus keyboard
                height: `calc(100svh - 56px - (${TABBAR_H}px + env(safe-area-inset-bottom)) - ${keyboardHeight}px)`,
                paddingBottom: 12, // tiny breathing room for last item
              }
            : undefined
        }
      >
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card"
          style={{
            height: `calc(${TABBAR_H}px + env(safe-area-inset-bottom))`,
            borderTop: "1px solid hsl(0 0% 93%)",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-center justify-around" style={{ height: `${TABBAR_H}px` }}>
            {mobileNavigation.map((item) => {
              const isActive = location.pathname === item.href;

              if (item.name === "Messages") {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex flex-col items-center justify-start gap-1 transition-colors min-w-0 flex-1 relative",
                      isActive ? "text-primary" : "text-[hsl(0_0%_70%)] hover:text-foreground",
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                      {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-[#00B67A] text-white rounded-full">
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                      )}
                    </div>
                    <span className="text-[11.5px] font-medium leading-tight">{item.name}</span>
                  </Link>
                );
              }

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
      )}

      {/* Sidebar (Desktop) */}
      {!isMobile && (
        <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
          <nav className="flex flex-col gap-1 p-4">
            {desktopNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      <TutorialOverlay />
    </div>
    </TutorialProvider>
  );
}
