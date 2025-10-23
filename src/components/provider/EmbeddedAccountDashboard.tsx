import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmbeddedAccountDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleOpenDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use hosted login link instead of embedded dashboard
      const { data, error: loginError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'login-link' }
      });

      if (loginError) throw loginError;
      
      if (!data?.url) {
        throw new Error('Failed to create dashboard link');
      }

      // Redirect to Stripe Express dashboard
      window.open(data.url, '_blank');

      toast({
        title: "Opening Dashboard",
        description: "You'll be redirected to Stripe to manage your account",
      });

    } catch (err: any) {
      console.error('Dashboard link error:', err);
      const errorMsg = err.message || 'Failed to load account dashboard';
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button
            onClick={handleOpenDashboard}
            variant="outline"
          >
            Try Again
          </Button>
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
      <CardContent className="space-y-4">
        <div className="p-6 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Click below to access your Stripe Express dashboard where you can manage your account settings, view payouts, and update banking information.
          </p>
          <Button 
            onClick={handleOpenDashboard}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Dashboard
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• View your available and pending balances</p>
          <p>• Set up and manage bank account details</p>
          <p>• Track payout history and schedules</p>
          <p>• Update tax information and business details</p>
        </div>
      </CardContent>
    </Card>
  );
}
