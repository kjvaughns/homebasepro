import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function EmbeddedAccountDashboard() {
  const [loading, setLoading] = useState(false);

  const openDashboard = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'login-link' }
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('No dashboard URL returned');
      }

      // Redirect to Stripe Express Dashboard
      window.location.href = data.url;

    } catch (err: any) {
      console.error('Dashboard error:', err);
      toast.error(err?.message || 'Failed to open dashboard');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & Payouts</CardTitle>
        <CardDescription>
          Manage your bank account, view balances, and track payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Access your Stripe Express Dashboard to manage payouts, bank accounts, and view transaction history.
          </p>
          <Button onClick={openDashboard} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Stripe Dashboard
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
