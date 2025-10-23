import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { addDays } from "date-fns";

interface EmbeddedSubscriptionSetupProps {
  onSuccess: () => void;
}

function SubscriptionSetupForm({ onSuccess }: EmbeddedSubscriptionSetupProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Confirm card setup
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.origin + '/onboarding/provider',
        }
      });

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (!setupIntent?.payment_method) {
        throw new Error('No payment method collected');
      }

      // Activate trial subscription with the payment method
      const { data, error: subError } = await supabase.functions.invoke(
        'provider-subscription',
        {
          body: {
            action: 'activate-trial-subscription',
            paymentMethodId: setupIntent.payment_method
          }
        }
      );

      if (subError) throw subError;

      toast({
        title: "🎉 Trial Started!",
        description: "Your 14-day free trial has begun"
      });

      onSuccess();

    } catch (err: any) {
      console.error('Subscription setup error:', err);
      toast({
        title: "Setup Failed",
        description: err.message || "Failed to start trial",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Start Your 14-Day Free Trial</CardTitle>
          <CardDescription>
            Card required • $15/month after trial • Cancel anytime
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PaymentElement />

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <Check className="h-4 w-4" />
              No charge today
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4" />
              First payment on {addDays(new Date(), 14).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4" />
              Cancel anytime before trial ends
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!stripe || processing} 
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting Trial...
              </>
            ) : (
              "Start Free Trial"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our terms of service
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

export default function EmbeddedSubscriptionSetup({ onSuccess }: EmbeddedSubscriptionSetupProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    try {
      // Get Stripe publishable key
      const { data: config } = await supabase.functions.invoke('get-stripe-config');
      if (!config?.publishableKey) {
        throw new Error('Stripe not configured');
      }

      setStripePromise(loadStripe(config.publishableKey));

      // Create SetupIntent for card collection
      const { data: setup, error } = await supabase.functions.invoke('provider-subscription', {
        body: { action: 'create-setup-intent' }
      });

      if (error) throw error;
      if (!setup?.clientSecret) {
        throw new Error('Failed to create setup session');
      }

      setClientSecret(setup.clientSecret);
    } catch (err: any) {
      console.error('Setup initialization error:', err);
      toast({
        title: "Initialization Failed",
        description: err.message || "Failed to initialize payment setup",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load payment form</p>
          <Button onClick={initializeSetup} variant="outline" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: 'hsl(var(--primary))',
          }
        }
      }}
    >
      <SubscriptionSetupForm onSuccess={onSuccess} />
    </Elements>
  );
}
