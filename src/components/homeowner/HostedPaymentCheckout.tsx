import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface HostedPaymentCheckoutProps {
  jobId: string;
  providerId: string;
  amount: number;
  description: string;
  onCancel: () => void;
}

export function HostedPaymentCheckout({ 
  jobId, 
  providerId, 
  amount, 
  description, 
  onCancel 
}: HostedPaymentCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Get provider's Stripe account ID
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_account_id')
        .eq('id', providerId)
        .single();

      if (!org?.stripe_account_id) {
        throw new Error('Provider payment setup incomplete');
      }

      // Create hosted checkout session
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'create-payment-checkout',
          amount_cents: Math.round(amount * 100),
          provider_account_id: org.stripe_account_id,
          description,
          metadata: {
            job_id: jobId,
            homeowner_id: profile?.id
          }
        }
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Service Amount</span>
            <span className="font-semibold">${amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            You'll be securely redirected to Stripe to complete this payment.
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={handlePayment} 
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By continuing, you authorize HomeBase to charge your payment method for this service.
        </p>
      </CardContent>
    </Card>
  );
}
