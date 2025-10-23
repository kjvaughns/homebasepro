import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User, Briefcase, ChevronDown, Plus, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const RoleSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasProviderRole, setHasProviderRole] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRoles();
  }, [location.pathname]);

  const checkRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has an organization (is a provider)
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      setHasProviderRole(!!orgData);

      // Check if user has admin role
      const { data: isAdmin } = await supabase.rpc("is_admin");
      setHasAdminRole(isAdmin || false);
    } catch (error) {
      console.error("Error checking roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const isProviderView = location.pathname.startsWith("/provider");
  const isAdminView = location.pathname.startsWith("/admin");

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isAdminView ? (
            <>
              <Shield className="h-4 w-4" />
              <span>Admin</span>
            </>
          ) : isProviderView ? (
            <>
              <Briefcase className="h-4 w-4" />
              <span>Provider</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Homeowner</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card z-50">
        <DropdownMenuItem
          onClick={() => navigate("/homeowner/dashboard")}
          className={!isProviderView && !isAdminView ? "bg-accent" : ""}
        >
          <User className="h-4 w-4 mr-2" />
          Homeowner Dashboard
        </DropdownMenuItem>
        
        {hasProviderRole || hasAdminRole ? (
          <DropdownMenuItem
            onClick={() => navigate("/provider/dashboard")}
            className={isProviderView ? "bg-accent" : ""}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Provider Dashboard
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/become-provider")}
              className="text-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Become a Provider
            </DropdownMenuItem>
          </>
        )}

        {hasAdminRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/admin/dashboard")}
              className={isAdminView ? "bg-accent" : ""}
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Portal
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
