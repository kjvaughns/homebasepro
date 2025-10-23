import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

interface EmbeddedConnectOnboardingProps {
  onComplete?: () => void;
}

export default function EmbeddedConnectOnboarding({ onComplete }: EmbeddedConnectOnboardingProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeOnboarding();
  }, []);

  const initializeOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get Stripe publishable key
      const { data: config } = await supabase.functions.invoke('get-stripe-config');
      if (!config?.publishableKey) {
        throw new Error('Stripe configuration missing');
      }

      // Get account session client secret
      const { data, error: sessionError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account-session' }
      });

      if (sessionError) throw sessionError;
      if (!data?.clientSecret || !data?.accountId) {
        throw new Error('Failed to create account session');
      }

      // Load Stripe with Connect account
      const stripe = await loadStripe(config.publishableKey, {
        stripeAccount: data.accountId
      });

      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Mount embedded onboarding component
      const connectInstance = (stripe as any).connectAccountOnboarding({
        clientSecret: data.clientSecret,
      });

      connectInstance.setOnExit(() => {
        toast({
          title: "Onboarding Incomplete",
          description: "Please complete all steps to accept payments",
          variant: "destructive"
        });
      });

      connectInstance.setOnLoadError((e: any) => {
        console.error('Stripe Connect load error:', e);
        setError('Failed to load onboarding form. Please refresh and try again.');
      });

      const container = document.getElementById('connect-onboarding-container');
      if (container) {
        connectInstance.mount(container);
      }

      setLoading(false);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const { data: status } = await supabase.functions.invoke('stripe-connect', {
          body: { action: 'check-status' }
        });

        if (status?.complete) {
          clearInterval(pollInterval);
          toast({
            title: "Payment Setup Complete!",
            description: "You can now accept payments from clients"
          });
          onComplete?.();
        }
      }, 3000);

      // Cleanup
      return () => {
        clearInterval(pollInterval);
        connectInstance.unmount();
      };

    } catch (err: any) {
      console.error('Embedded onboarding error:', err);
      setError(err.message || 'Failed to initialize onboarding');
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={initializeOnboarding}
          className="mt-4 text-sm underline hover:no-underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div id="connect-onboarding-container" className="min-h-[600px]" />
    </div>
  );
}
