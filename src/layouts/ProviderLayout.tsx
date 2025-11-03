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
  MessageSquare,
  Settings,
  DollarSign,
  Briefcase,
  CreditCard,
  RotateCcw,
  Home,
  MoreHorizontal,
  HelpCircle,
} from "lucide-react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SupportDrawer } from "@/components/support/SupportDrawer";
import homebaseLogo from "@/assets/homebase-logo.png";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { JobsMenuSheet } from "@/components/provider/JobsMenuSheet";
import { TeamMenuSheet } from "@/components/provider/TeamMenuSheet";
import { FinancialMenuSheet } from "@/components/provider/FinancialMenuSheet";
import { useMessaging } from "@/contexts/MessagingContext";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useAutoScrollToInput } from "@/hooks/useAutoScrollToInput";
import { initPWADetection } from "@/utils/pwaDetection";
import { FloatingAIButton } from "@/components/provider/FloatingAIButton";
import { AIChatModal } from "@/components/ai/AIChatModal";

// --- Mobile bottom nav (icons + label) content height ---
const TABBAR_H = 80;

const mobileNavigation = [
  { name: "Home", href: "/provider/dashboard", icon: Home },
  { name: "Jobs", href: "/provider/jobs", icon: Briefcase, hasSubmenu: true },
  { name: "Clients", href: "/provider/clients", icon: Users },
  { name: "Messages", href: "/provider/messages", icon: MessageSquare },
  { name: "More", href: "/provider/more", icon: MoreHorizontal },
];

const ProviderLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isMessagesPage = location.pathname.startsWith('/provider/messages');
  const keyboardHeight = useKeyboardHeight();
  useAutoScrollToInput();

  const [organization, setOrganization] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { totalUnread } = useMessaging();
  const [jobsSheetOpen, setJobsSheetOpen] = useState(false);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [financialSheetOpen, setFinancialSheetOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  const isMessagesRoute = location.pathname.startsWith("/provider/messages");
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize PWA detection
    initPWADetection();
    
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
      setIsAdmin(!!admin);

      const { data: org } = await supabase.from("organizations").select("*").eq("owner_id", user.id).maybeSingle();

      if (!org) {
        // Only redirect to onboarding if not an admin
        if (!admin) {
          toast({
            title: "Setup Required",
            description: "Please complete your provider onboarding",
            variant: "destructive",
          });
          navigate("/become-provider");
          return;
        }
        // Admin with no org can still access portal, just no Team features
      } else {
        setOrganization(org);
        setIsOwner(org.owner_id === user.id);
      }
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
      <TutorialProvider role="provider">
      <div className="min-h-[100svh] overflow-hidden bg-background flex flex-col">
        <header className="safe-area-header sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14">
          <div className="container flex h-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/provider/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
                <span className="hidden md:block">{organization?.name || "Provider"}</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).Intercom) {
                    (window as any).Intercom('show');
                  }
                }}
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
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
                  <DropdownMenuItem onClick={() => navigate("/provider/notifications")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => setTeamSheetOpen(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Team</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/provider/refund-requests")}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        <span>Refund Requests</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/provider/account")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/provider/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).Intercom) {
                        (window as any).Intercom('show');
                      }
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Admin Portal</span>
                      </DropdownMenuItem>
                    </>
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

        {/* Main — scroller between header and tab bar */}
        <main
          ref={mainRef}
          className={cn(isMessagesRoute ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden", "pb-4")}
          style={{
            height: `calc(100svh - 56px - env(safe-area-inset-top) - (${TABBAR_H}px + env(safe-area-inset-bottom)) - ${keyboardHeight}px)`,
          }}
        >
          <Outlet />
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-card"
          style={{
            height: `calc(${TABBAR_H}px + env(safe-area-inset-bottom))`,
            paddingBottom: "env(safe-area-inset-bottom)",
            borderTop: "1px solid hsl(0 0% 93%)",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-around" style={{ height: `${TABBAR_H}px` }}>
            {mobileNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.hasSubmenu && location.pathname.startsWith(item.href.split('/').slice(0, 3).join('/')));
              
              // Messages link with unread badge
              if (item.name === "Messages") {
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
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
                  </button>
                );
              }

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.hasSubmenu) {
                      if (item.name === 'Jobs') setJobsSheetOpen(true);
                    } else {
                      navigate(item.href);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-start gap-1 transition-colors min-w-0 flex-1",
                    isActive ? "text-primary" : "text-[hsl(0_0%_70%)] hover:text-foreground",
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[11.5px] font-medium leading-tight">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sheet Menus */}
        <JobsMenuSheet open={jobsSheetOpen} onOpenChange={setJobsSheetOpen} />
        {isOwner && <TeamMenuSheet open={teamSheetOpen} onOpenChange={setTeamSheetOpen} />}
        <FinancialMenuSheet open={financialSheetOpen} onOpenChange={setFinancialSheetOpen} />

        {/* Floating AI Button */}
        <FloatingAIButton onAIChat={() => setShowAIChat(true)} />

        {/* AI Chat Modal */}
        <AIChatModal open={showAIChat} onOpenChange={setShowAIChat} userRole="provider" />

        {!isMobile && <TutorialOverlay />}
      </div>
      </TutorialProvider>
    );
  }

  // -------------------- DESKTOP --------------------
  return (
    <TutorialProvider role="provider">
    <SidebarProvider>
      <header
        id="provider-topbar"
        className="safe-area-header sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14"
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).Intercom) {
                  (window as any).Intercom('show');
                }
              }}
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
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
                {isOwner && (
                  <>
                    <DropdownMenuItem onClick={() => setTeamSheetOpen(true)}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Team</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/provider/refund-requests")}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      <span>Refund Requests</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate("/provider/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).Intercom) {
                      (window as any).Intercom('show');
                    }
                  }}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Admin Portal</span>
                    </DropdownMenuItem>
                  </>
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

      {/* Sidebar + Main fixed layout */}
      <div className="fixed left-0 top-14 right-0 bottom-0 grid" style={{ gridTemplateColumns: "16rem 1fr" }}>
        <SidebarProvider>
          <aside className="border-r bg-background overflow-y-auto">
            <ProviderSidebar />
          </aside>
        </SidebarProvider>

        <main
          ref={mainRef}
          className={cn(isMessagesRoute ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden", "pb-[120px] md:pb-8")}
          style={{ height: "calc(100vh - 56px - env(safe-area-inset-top))" }}
        >
          <Outlet />
        </main>
      </div>

      {/* Sheet Menus (Desktop) */}
      <JobsMenuSheet open={jobsSheetOpen} onOpenChange={setJobsSheetOpen} />
      {isOwner && <TeamMenuSheet open={teamSheetOpen} onOpenChange={setTeamSheetOpen} />}
      <FinancialMenuSheet open={financialSheetOpen} onOpenChange={setFinancialSheetOpen} />
      
      {/* Floating AI Button */}
      <FloatingAIButton onAIChat={() => setShowAIChat(true)} />

      {/* AI Chat Modal */}
      <AIChatModal open={showAIChat} onOpenChange={setShowAIChat} userRole="provider" />
      
      {/* Tutorial Overlay */}
      {!isMobile && <TutorialOverlay />}
    </SidebarProvider>
    </TutorialProvider>
  );
};

export default ProviderLayout;
