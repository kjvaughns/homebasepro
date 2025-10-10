import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const PWALaunch = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handlePWALaunch = async () => {
      try {
        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Not authenticated, redirect to login
          navigate("/login", { replace: true });
          return;
        }

        // Get user profile to determine role
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type, user_id")
          .eq("user_id", session.user.id)
          .single();

        // Check if user is admin
        const { data: hasAdminRole } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin"
        });

        if (hasAdminRole) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        // Check if user owns an organization (provider)
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", session.user.id)
          .single();

        if (org) {
          navigate("/provider/dashboard", { replace: true });
          return;
        }

        // Default to homeowner dashboard
        navigate("/dashboard", { replace: true });
      } catch (error) {
        console.error("Error determining route:", error);
        // Fallback to login on error
        navigate("/login", { replace: true });
      }
    };

    handlePWALaunch();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading HomeBase...</p>
      </div>
    </div>
  );
};

export default PWALaunch;
