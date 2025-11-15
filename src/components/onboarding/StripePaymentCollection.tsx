import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onSkip: () => void;
  clientSecret: string;
}

function PaymentForm({ onSuccess, onSkip, clientSecret }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");

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
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-start gap-2 text-sm">
          <Lock className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground mb-1">🎉 One last step to unlock Pro features!</p>
            <p className="text-muted-foreground">
              Add your card to start your 7-day trial. <strong>No charge until day 8.</strong> Cancel anytime before then.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="promo-code" className="text-sm">Discount Code (Optional)</Label>
        <input
          id="promo-code"
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Enter discount code"
          className="w-full px-3 py-2 rounded-md border bg-background"
        />
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
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up secure payment form...</p>
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
      <PaymentForm onSuccess={onSuccess} onSkip={onSkip} clientSecret={clientSecret!} />
    </Elements>
  );
}
