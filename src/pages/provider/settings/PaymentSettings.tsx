import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PaymentSettings() {
  const [stripeConnected, setStripeConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'check-status' }
      });

      if (error) throw error;

      setStripeConnected(data?.paymentsReady || false);
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      toast.error('Failed to check payment status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      // Create account
      await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account' }
      });

      // Get onboarding link
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'account-link' }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No onboarding URL');

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Onboarding error:', err);
      toast.error(err?.message || 'Failed to start onboarding');
      setLoading(false);
    }
  };

  const openDashboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'login-link' }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No dashboard URL');

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Dashboard error:', err);
      toast.error(err?.message || 'Failed to open dashboard');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>
            Connect your Stripe account to accept payments from customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking payment status...</span>
            </div>
          ) : stripeConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Stripe Connected</span>
              </div>
              <Button onClick={openDashboard} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage Payouts & Bank Account
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Set up your Stripe account to start accepting payments. You'll be redirected to Stripe's secure onboarding.
              </p>
              <Button onClick={startOnboarding} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connect Stripe Account
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
