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
import { User, Briefcase, ChevronDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const RoleSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasProviderRole, setHasProviderRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRoles();
  }, []);

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
    } catch (error) {
      console.error("Error checking roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const isProviderView = location.pathname.startsWith("/provider");

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isProviderView ? (
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
          onClick={() => navigate("/dashboard")}
          className={!isProviderView ? "bg-accent" : ""}
        >
          <User className="h-4 w-4 mr-2" />
          Homeowner Dashboard
        </DropdownMenuItem>
        
        {hasProviderRole ? (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
