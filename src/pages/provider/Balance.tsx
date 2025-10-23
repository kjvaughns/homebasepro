import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import EmbeddedAccountDashboard from "@/components/provider/EmbeddedAccountDashboard";

export default function Balance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stripeOnboarded, setStripeOnboarded] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_onboarding_complete, stripe_account_id')
        .eq('owner_id', user.id)
        .single();

      setStripeOnboarded(org?.stripe_onboarding_complete && !!org?.stripe_account_id);
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Balance & Payouts</h1>
        <p className="text-muted-foreground">
          Manage your funds and payouts
        </p>
      </div>

      {!stripeOnboarded ? (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Complete Stripe Setup
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to accept payments and receive payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/provider/settings?tab=payments')}>
              Connect Stripe Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <EmbeddedAccountDashboard />
      )}
    </div>
  );
}
