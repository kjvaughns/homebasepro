import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface StripeAccountStatusProps {
  stripeAccountId: string | null;
}

export function StripeAccountStatus({ stripeAccountId }: StripeAccountStatusProps) {
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stripeAccountId) {
      checkAccountStatus();
    }
  }, [stripeAccountId]);

  const checkAccountStatus = async () => {
    if (!stripeAccountId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccountStatus(data);
      }
    } catch (error) {
      console.error('Failed to check account status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOnboardingLink = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('partner-approve', {
        body: { action: 'create-onboarding-link' }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to create onboarding link:', error);
    }
  };

  if (!stripeAccountId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Stripe Account Not Connected</AlertTitle>
        <AlertDescription>
          Contact support to set up your Stripe Connect account.
        </AlertDescription>
      </Alert>
    );
  }

  if (!accountStatus) return null;

  const isComplete = accountStatus.charges_enabled && accountStatus.payouts_enabled;
  const hasRequirements = accountStatus.requirements?.currently_due?.length > 0;

  if (isComplete && !hasRequirements) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Stripe Account Active</AlertTitle>
        <AlertDescription>
          Your account is fully set up and ready to receive payouts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Complete Your Stripe Setup</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          You need to complete your Stripe Connect onboarding to receive payouts.
        </p>
        {hasRequirements && (
          <p className="text-sm">
            Missing requirements: {accountStatus.requirements.currently_due.join(', ')}
          </p>
        )}
        <Button onClick={createOnboardingLink} size="sm" className="mt-2">
          Complete Setup
        </Button>
      </AlertDescription>
    </Alert>
  );
}
