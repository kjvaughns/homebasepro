import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, LogOut, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import homebaseLogo from "@/assets/homebase-logo.png";
import { useToast } from "@/hooks/use-toast";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/ProviderSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ProviderLayout() {
  const navigate = useNavigate();
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

      if (profile.user_type !== "provider") {
        toast({
          title: "Access denied",
          description: "This area is for service providers only.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setUserProfile(profile);

      // Check if user is admin first - admins can view without organization
      const { data: isAdminData, error: adminError } = await supabase.rpc("is_admin");
      if (!adminError && isAdminData) {
        setIsAdmin(true);
        return;
      }

      // Non-admins need organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (orgError) {
        toast({
          title: "Setup Required",
          description: "Please complete your provider onboarding",
          variant: "destructive",
        });
        navigate("/onboarding/provider");
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        {/* Admin Preview Banner */}
        {isAdmin && (
          <Alert className="rounded-none border-x-0 border-t-0 bg-primary/10 border-primary">
            <Eye className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Preview Mode</strong> - Viewing as Provider
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-1">
          <ProviderSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border bg-card">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={homebaseLogo} alt="HomeBase" className="h-8 w-8" />
                <span className="text-2xl font-bold text-foreground">HomeBase</span>
              </div>
              <div className="flex items-center gap-4">
                {!isMobile && <RoleSwitcher />}
                {organization && (
                  <span className="text-sm text-muted-foreground">{organization.name}</span>
                )}
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
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
