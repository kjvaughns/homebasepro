import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { PWAOnboardingFlow } from "@/components/pwa/PWAOnboardingFlow";

const PWALaunch = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string>('/');

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

        // Determine target route based on role
        let route = "/homeowner/dashboard";
        
        if (hasAdminRole) {
          route = "/admin/dashboard";
        } else {
          // Check if user owns an organization (provider)
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", session.user.id)
            .single();

          if (org) {
            route = "/provider/dashboard";
          }
        }

        // Check if onboarding has been completed
        const onboardingCompleted = localStorage.getItem('pwa_onboarding_completed');
        
        if (!onboardingCompleted) {
          // Show onboarding first
          setTargetRoute(route);
          setShowOnboarding(true);
        } else {
          // Go directly to dashboard
          navigate(route, { replace: true });
        }
      } catch (error) {
        console.error("Error determining route:", error);
        // Fallback to login on error
        navigate("/login", { replace: true });
      }
    };

    handlePWALaunch();
  }, [navigate]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate(targetRoute, { replace: true });
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading HomeBase...</p>
        </div>
      </div>

      <PWAOnboardingFlow 
        open={showOnboarding} 
        onComplete={handleOnboardingComplete}
      />
    </>
  );
};

export default PWALaunch;
