import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodCardProps {
  paymentMethod: any;
  onUpdate: () => void;
}

function UpdatePaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (setupError) throw new Error(setupError.message);

      // Update subscription payment method
      const { error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'update-subscription-payment-method',
          paymentMethodId: setupIntent.payment_method
        }
      });

      if (error) throw error;

      toast({
        title: "Payment Method Updated",
        description: "Your card has been updated successfully"
      });

      onSuccess();
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2">
        <Button type="submit" disabled={!stripe || processing} className="flex-1">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Card"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodCard({ paymentMethod, onUpdate }: PaymentMethodCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdateClick = async () => {
    setLoading(true);
    try {
      // Get Stripe config
      const { data: config } = await supabase.functions.invoke('get-stripe-config');
      setStripePromise(loadStripe(config.publishableKey));

      // Create setup intent
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'create-setup-intent' }
      });

      if (error) throw error;
      setClientSecret(data.clientSecret);
      setShowDialog(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setShowDialog(false);
    onUpdate();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your default payment method</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethod ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">•••• {paymentMethod.last4}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleUpdateClick} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No payment method on file</p>
              <Button onClick={handleUpdateClick} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Card"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Update your card details below
            </DialogDescription>
          </DialogHeader>
          {clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' }
              }}
            >
              <UpdatePaymentForm 
                onSuccess={handleSuccess} 
                onCancel={() => setShowDialog(false)} 
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
