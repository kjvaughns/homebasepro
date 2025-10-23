import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

export default function HostedSubscriptionSetup() {
  const [loading, setLoading] = useState(false);

  const startTrial = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { 
          action: 'create-subscription-checkout'
        }
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (err: any) {
      console.error('Subscription error:', err);
      toast.error(err?.message || 'Failed to start trial');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Your 14-Day Free Trial</CardTitle>
        <CardDescription>
          Full access to all features, no credit card required
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Unlimited clients and jobs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Team management & time tracking</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>AI-powered insights</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Payment processing with Stripe</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            You'll be securely redirected to Stripe to set up your subscription. Cancel anytime during your trial.
          </p>
          <Button onClick={startTrial} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Start Free Trial
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          After trial: $15/month • Cancel anytime
        </p>
      </CardContent>
    </Card>
  );
}
