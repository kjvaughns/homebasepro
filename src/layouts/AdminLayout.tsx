import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  Loader2,
  LayoutDashboard,
  Database,
  TrendingUp,
  Shield,
  Users,
  Settings,
  LogOut,
  User as UserIcon,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import homebaseLogo from "@/assets/homebase-logo.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const mobileNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { name: "Data", href: "/admin/data", icon: Database },
  { name: "Team", href: "/admin/team", icon: Shield },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/admin/login");
          return;
        }

        // Check if user has admin or moderator role
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "moderator"])
          .maybeSingle();

        if (!roleRow) {
          console.error("Access denied: Not an admin/moderator");
          navigate("/");
          return;
        }

        // Load profile
        const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

        if (profileData) {
          setUserProfile(profileData);
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14">
        <div className="container flex h-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <img src={homebaseLogo} alt="HomeBase" className="h-6 w-6" />
              <span className="hidden md:block">Admin Portal</span>
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
              <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/data")}>
                  <Database className="mr-2 h-4 w-4" />
                  <span>Data Management</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/analytics")}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>Analytics</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/revenue")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>Revenue</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>User Management</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                  <UserIcon className="mr-2 h-4 w-4" />
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

      <main
        className={cn(
          "flex-1 min-h-0 overflow-y-auto", // ← main is the scroller
          isMobile ? "" : "pl-64",
        )}
        style={
          isMobile
            ? {
                // reserve space for the 80px tab bar + safe area
                paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
              }
            : undefined
        }
      >
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) - Outlook Style */}
      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card"
          style={{
            borderTop: "1px solid hsl(0 0% 93%)",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
            height: "calc(80px + env(safe-area-inset-bottom))",
            paddingBottom: "env(safe-area-inset-bottom)", // safe area only once
          }}
        >
          <div className="flex items-center justify-around" style={{ height: "80px" }}>
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
      )}

      {/* Sidebar (Desktop) */}
      {!isMobile && (
        <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)]">
          <AdminSidebar />
        </aside>
      )}
    </div>
  );
};

export default AdminLayout;
