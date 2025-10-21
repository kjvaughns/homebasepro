import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getStripeErrorMessage, getStripeErrorTitle } from '@/utils/stripeErrorMessages';
import { logError } from '@/utils/errorHandler';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Dynamically load Stripe with publishable key from backend
const getStripePromise = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('get-stripe-config');
    if (error) throw error;
    return loadStripe(data.publishableKey);
  } catch (error) {
    console.error('Failed to load Stripe:', error);
    return null;
  }
};

interface PaymentCheckoutProps {
  jobId: string;
  providerId: string;
  amount: number;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CheckoutFormProps {
  jobId: string;
  amount: number;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ jobId, amount, description, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tip, setTip] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const total = amount + tip;
  const platformFee = Math.round(total * 0.03 * 100) / 100; // 3% platform fee shown to homeowner

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/homeowner/jobs/${jobId}/success`,
        },
      });

      if (error) {
        toast({
          title: getStripeErrorTitle(error),
          description: getStripeErrorMessage(error),
          variant: 'destructive',
        });
      } else {
        onSuccess();
      }
    } catch (error: any) {
      logError('Payment', error);
      toast({
        title: getStripeErrorTitle(error),
        description: getStripeErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Service Amount</Label>
          <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
        </div>

        <div>
          <Label htmlFor="tip">Add Tip (Optional)</Label>
          <Input
            id="tip"
            type="number"
            step="0.01"
            min="0"
            value={tip}
            onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        <div className="pt-4 space-y-2 border-t">
          <div className="flex justify-between text-sm">
            <span>Service</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-sm">
              <span>Tip</span>
              <span>${tip.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Platform Fee</span>
            <span>${platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>${(total + platformFee).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div>
        <Label>Payment Method</Label>
        <PaymentElement />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${(total + platformFee).toFixed(2)}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1"
          size="lg"
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By confirming, you authorize HomeBase to charge your payment method for this service.
      </p>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this payment? You'll return to the booking screen and will need to complete payment later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Payment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Yes, Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export function PaymentCheckout({ jobId, providerId, amount, description, onSuccess, onCancel }: PaymentCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const stripe = await getStripePromise();
      setStripePromise(Promise.resolve(stripe));
      await createPaymentIntent();
    };
    init();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'homeowner-payment-intent',
          jobId,
          homeownerId: profile?.id,
          amount,
          captureNow: true,
          tip: 0,
        },
      });

      if (error) throw error;

      setClientSecret(data.clientSecret);
    } catch (error) {
      logError('Payment Intent Creation', error);
      toast({
        title: 'Setup failed',
        description: 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Failed to initialize payment</p>
            <Button onClick={onCancel}>Go Back</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm
            jobId={jobId}
            amount={amount}
            description={description}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
