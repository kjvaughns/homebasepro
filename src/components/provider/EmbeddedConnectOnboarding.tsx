import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface EmbeddedConnectOnboardingProps {
  onComplete?: () => void;
}

export default function EmbeddedConnectOnboarding({ onComplete }: EmbeddedConnectOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create account if needed
      const { data: accountData, error: accountError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account' }
      });

      if (accountError) throw accountError;

      // Step 2: Get hosted onboarding link
      const { data: linkData, error: linkError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'account-link' }
      });

      if (linkError) throw linkError;
      if (!linkData?.url) {
        throw new Error('No onboarding URL returned');
      }

      // Redirect to Stripe hosted onboarding
      window.location.href = linkData.url;

    } catch (err: any) {
      console.error('Onboarding error:', err);
      const message = err?.message || 'Failed to start onboarding';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Payments</CardTitle>
        <CardDescription>
          Connect your Stripe account to receive payments from customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You'll be securely redirected to Stripe to complete account setup and verification.
          </p>
          <Button 
            onClick={startOnboarding} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Continue to Stripe
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
