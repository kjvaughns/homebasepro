import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmbeddedConnectOnboardingProps {
  onComplete?: () => void;
  simplified?: boolean;
}

export default function EmbeddedConnectOnboarding({ onComplete, simplified = false }: EmbeddedConnectOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: accountData, error: accountError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account' }
      });

      if (accountError) throw accountError;
      if (!accountData?.account_id) throw new Error('Failed to create Stripe account');

      const { data: linkData, error: linkError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'account-link' }
      });

      if (linkError) throw linkError;
      if (!linkData?.url) throw new Error('Failed to create onboarding link');

      window.location.href = linkData.url;
    } catch (err: any) {
      setError(err.message || 'Failed to start onboarding');
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={handleStartOnboarding} variant="outline">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment Setup</CardTitle>
        <CardDescription>Connect your Stripe account to start accepting payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Secure Setup</p>
              <p className="text-sm text-muted-foreground">Your information is encrypted and secure</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Bank Details</p>
              <p className="text-sm text-muted-foreground">Link your bank account for direct deposits</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Business Information</p>
              <p className="text-sm text-muted-foreground">Verify your business or personal details</p>
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">
            You'll be redirected to Stripe to complete a secure onboarding process. This typically takes 5-10 minutes.
          </p>
          <Button onClick={handleStartOnboarding} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-5 w-5" />
                Start Onboarding
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to Stripe's{" "}
          <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="underline">
            Connected Account Agreement
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
