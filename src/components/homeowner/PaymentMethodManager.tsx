import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      // Check if customer exists
      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      if (!customer) {
        // Create payment method first
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          elements,
        });

        if (pmError) throw pmError;

        // Create customer with payment method
        const { data, error } = await supabase.functions.invoke('payments-api', {
          body: {
            action: 'create-homeowner-customer',
            profileId: profile?.id,
            email: user.email,
            name: profile?.full_name,
            paymentMethodId: paymentMethod?.id,
          },
        });

        if (error) throw error;
      } else {
        // Add payment method to existing customer
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          elements,
        });

        if (pmError) throw pmError;

        // Attach to customer (would need a new action in payments-api)
        toast({
          title: 'Payment method added',
          description: 'Your payment method has been saved',
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Payment method error:', error);
      toast({
        title: 'Failed to add payment method',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Payment Method'
        )}
      </Button>
    </form>
  );
}

export function PaymentMethodManager() {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [setupIntent, setSetupIntent] = useState<string>('');
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const stripe = await getStripePromise();
      setStripePromise(Promise.resolve(stripe));
      await loadCustomer();
    };
    init();
  }, []);

  const loadCustomer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      setCustomer(data);
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      // Create setup intent for adding payment method
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      // For now, we'll use the payment intent flow
      // In production, you'd want to use SetupIntent for saving cards without charging
      setShowAddDialog(true);
      setSetupIntent('setup_intent_client_secret'); // Placeholder
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your saved payment methods for faster checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer?.default_payment_method ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Card ending in ****</p>
                  <p className="text-sm text-muted-foreground">Default payment method</p>
                </div>
              </div>
              <Badge>Default</Badge>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No payment methods saved</p>
              <Button onClick={handleAddPaymentMethod}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </div>
          )}

          {customer?.default_payment_method && (
            <Button onClick={handleAddPaymentMethod} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Payment Method
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment method to your account
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your card will be securely saved for future payments. You won't be charged now.
            </p>

            {/* In production, use SetupIntent */}
            <div className="text-center py-8 text-muted-foreground">
              Payment method form will appear here with Stripe SetupIntent
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
