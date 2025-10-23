import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

export default function EmbeddedAccountDashboard() {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      // Get account session for dashboard
      const { data, error: sessionError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-dashboard-session' }
      });

      if (sessionError) throw sessionError;
      if (!data?.clientSecret) {
        throw new Error('Failed to create dashboard session');
      }

      // Get Stripe config
      const { data: config } = await supabase.functions.invoke('get-stripe-config');
      if (!config?.publishableKey) {
        throw new Error('Stripe configuration missing');
      }

      // Load Stripe
      const stripe = await loadStripe(config.publishableKey);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Mount embedded account dashboard
      const connectedAccount = (stripe as any).connectAccountManagement({
        clientSecret: data.clientSecret,
      });

      const container = document.getElementById('account-dashboard-container');
      if (container) {
        connectedAccount.mount(container);
      }

      setMounted(true);

      // Cleanup on unmount
      return () => {
        connectedAccount.unmount();
      };

    } catch (err: any) {
      console.error('Dashboard initialization error:', err);
      setError(err.message || 'Failed to load account dashboard');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={initializeDashboard}
            className="mt-4 text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & Payouts</CardTitle>
        <CardDescription>
          Manage your bank account, view balances, and track payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative min-h-[600px]">
          {!mounted && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div id="account-dashboard-container" className="min-h-[600px]" />
        </div>
      </CardContent>
    </Card>
  );
}
