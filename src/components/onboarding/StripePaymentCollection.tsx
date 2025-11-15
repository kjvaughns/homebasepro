import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onSkip: () => void;
}

function PaymentForm({ onSuccess, onSkip }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setLoading(true);
    
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) throw error;
      
      if (setupIntent?.payment_method) {
        onSuccess(setupIntent.payment_method as string);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save payment method");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-2 text-sm text-blue-200">
          <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Card required for 7-day trial.</strong> You won't be charged until day 8. Cancel anytime.
          </p>
        </div>
      </div>
      
      <div className="bg-background/50 p-4 rounded-lg">
        <PaymentElement />
      </div>

      <div className="space-y-2">
        <Button 
          type="submit" 
          disabled={!stripe || loading} 
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving card...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Start 7-Day Trial
            </>
          )}
        </Button>
        
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onSkip}
          className="w-full"
        >
          Continue with Free Plan (No card needed)
        </Button>
      </div>
    </form>
  );
}

interface StripePaymentCollectionProps {
  onSuccess: (paymentMethodId: string) => void;
  onSkip: () => void;
}

export function StripePaymentCollection({ onSuccess, onSkip }: StripePaymentCollectionProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const createSetupIntent = async () => {
      try {
        // Check authentication first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', { 
          hasSession: !!session, 
          hasToken: !!session?.access_token,
          error: sessionError 
        });
        
        if (!session?.access_token) {
          throw new Error("Please complete signup before adding payment method");
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        console.log('Creating setup intent for user:', user.id);

        const { data, error } = await supabase.functions.invoke('create-setup-intent', {
          body: {}
        });

        console.log('Setup intent response:', { data, error });

        if (error) {
          console.error('Setup intent error:', error);
          throw new Error(error.message || "Failed to initialize payment");
        }
        
        if (!data?.clientSecret) {
          throw new Error("No client secret returned");
        }
        
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error('Payment form error:', error);
        toast.error(
          error.message === "Stripe secret key not configured" 
            ? "Payment system not configured. Please contact support." 
            : error.message || "Failed to load payment form. You can skip and use the free plan."
        );
      } finally {
        setLoading(false);
      }
    };

    createSetupIntent();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Unable to load payment form</p>
        <Button onClick={onSkip} variant="outline">
          Continue with Free Plan
        </Button>
      </div>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#10b981',
          }
        }
      }}
    >
      <PaymentForm onSuccess={onSuccess} onSkip={onSkip} />
    </Elements>
  );
}
