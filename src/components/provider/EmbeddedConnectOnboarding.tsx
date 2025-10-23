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
      const { data: config, error: configError } = await supabase.functions.invoke('get-stripe-config');
      
      if (configError) {
        console.error('Stripe config error:', configError);
        throw new Error('Failed to load Stripe configuration');
      }
      
      if (!config?.publishableKey) {
        throw new Error('Payment system not configured. Please contact support.');
      }

      // Get account session client secret
      const { data, error: sessionError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account-session' }
      });

      if (sessionError) {
        console.error('Account session error:', sessionError);
        throw new Error(sessionError.message || 'Failed to create onboarding session');
      }
      
      // Check for error response format (ok: false)
      if (data?.ok === false) {
        const errorMsg = data.code === 'ACCOUNT_CREATE_FAILED' 
          ? 'Unable to create payment account. Please try again or contact support.'
          : data.message || 'Payment setup failed. Please try again.';
        throw new Error(errorMsg);
      }
      
      if (!data?.clientSecret || !data?.accountId) {
        throw new Error('Payment setup failed. Please try again.');
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
        console.log('User exited onboarding');
        toast({
          title: "Setup Paused",
          description: "You can resume anytime. Complete all steps to start accepting payments.",
          variant: "destructive"
        });
      });

      connectInstance.setOnLoadError((e: any) => {
        console.error('Stripe Connect load error:', e);
        setError('Failed to load payment setup. Please check your connection and try again.');
        setLoading(false);
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
      
      // Parse error message for user-friendly display
      let userMessage = 'Failed to initialize payment setup. Please try again.';
      
      if (err.message?.includes('not configured')) {
        userMessage = 'Payment system not configured. Please contact support@homebaseproapp.com';
      } else if (err.message?.includes('authentication') || err.message?.includes('auth')) {
        userMessage = 'Session expired. Please refresh the page and try again.';
      }
      
      setError(userMessage);
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
