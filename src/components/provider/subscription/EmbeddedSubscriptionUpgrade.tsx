import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface EmbeddedSubscriptionUpgradeProps {
  targetPlan: 'growth' | 'pro' | 'scale';
  onSuccess: () => void;
  onCancel: () => void;
}

const planDetails = {
  growth: { name: 'Growth', price: '$49/month', fee: '2.5%' },
  pro: { name: 'Pro', price: '$99/month', fee: '2%' },
  scale: { name: 'Scale', price: '$199/month', fee: '1.5%' }
};

function UpgradeForm({ targetPlan, onSuccess, onCancel }: EmbeddedSubscriptionUpgradeProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Confirm payment method setup
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (setupError) throw new Error(setupError.message);

      // Upgrade subscription
      const { data, error: upgradeError } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'upgrade-plan',
          plan: targetPlan,
          paymentMethodId: setupIntent.payment_method
        }
      });

      if (upgradeError) throw upgradeError;

      toast({
        title: "Plan Upgraded! 🎉",
        description: `Welcome to ${planDetails[targetPlan].name}`
      });

      onSuccess();

    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast({
        title: "Upgrade Failed",
        description: err.message || "Failed to upgrade plan",
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
          <CardTitle>Upgrade to {planDetails[targetPlan].name}</CardTitle>
          <CardDescription>
            {planDetails[targetPlan].price} • {planDetails[targetPlan].fee} transaction fee
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PaymentElement 
            onReady={() => setIsElementReady(true)}
          />

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <Check className="h-4 w-4" />
              Prorated billing
            </div>
            <p className="text-muted-foreground">
              You'll only pay for the remainder of your current billing period
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!stripe || !isElementReady || processing} 
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upgrading...
                </>
              ) : (
                `Upgrade to ${planDetails[targetPlan].name}`
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default function EmbeddedSubscriptionUpgrade(props: EmbeddedSubscriptionUpgradeProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    initializeUpgrade();
  }, []);

  const initializeUpgrade = async () => {
    try {
      setLoading(true);
      
      // Get Stripe config
      const { data: config } = await supabase.functions.invoke('get-stripe-config');
      setStripePromise(loadStripe(config.publishableKey));

      // Create setup intent for payment method
      const { data: setup, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'create-setup-intent' }
      });

      if (error) throw error;
      setClientSecret(setup.clientSecret);
    } catch (err: any) {
      toast({
        title: "Setup Failed",
        description: err.message,
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
          <p className="text-muted-foreground">Failed to load upgrade form</p>
          <Button onClick={initializeUpgrade} variant="outline" className="mt-4">
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
        appearance: { theme: 'stripe' }
      }}
    >
      <UpgradeForm {...props} />
    </Elements>
  );
}
