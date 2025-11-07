import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SubscriptionOverviewCard } from "@/components/provider/subscription/SubscriptionOverviewCard";
import { PaymentMethodCard } from "@/components/provider/subscription/PaymentMethodCard";
import { BillingHistoryCard } from "@/components/provider/subscription/BillingHistoryCard";
import { UpcomingInvoiceCard } from "@/components/provider/subscription/UpcomingInvoiceCard";
import { CancellationFlow } from "@/components/provider/subscription/CancellationFlow";
import EmbeddedSubscriptionUpgrade from "@/components/provider/subscription/EmbeddedSubscriptionUpgrade";

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'growth' | 'pro' | 'scale'>('growth');
  const { toast } = useToast();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      // Load subscription details
      const { data: subData, error: subError } = await supabase.functions.invoke('payments-api', {
        body: { action: 'get-subscription' }
      });

      if (subError) throw subError;
      setSubscription(subData.subscription);

      // Load payment method if subscription exists
      if (subData.subscription?.stripe_subscription_id) {
        const { data: stripeSub } = await supabase.functions.invoke('payments-api', {
          body: {
            action: 'get-stripe-subscription',
            subscriptionId: subData.subscription.stripe_subscription_id
          }
        });

        if (stripeSub?.subscription?.default_payment_method) {
          setPaymentMethod(stripeSub.subscription.default_payment_method);
        }
      }

    } catch (err: any) {
      console.error('Failed to load subscription:', err);
      toast({
        title: "Error",
        description: "Failed to load subscription details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: 'growth' | 'pro' | 'scale') => {
    setTargetPlan(plan);
    setShowUpgrade(true);
  };

  const handleUpgradeSuccess = () => {
    setShowUpgrade(false);
    loadSubscriptionData();
  };

  const handleCancelSuccess = () => {
    setShowCancel(false);
    loadSubscriptionData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your subscription, payment methods, and billing history</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SubscriptionOverviewCard
            subscription={subscription}
            onUpgrade={() => handleUpgrade('pro')}
            onCancel={() => setShowCancel(true)}
          />
          
          <PaymentMethodCard
            paymentMethod={paymentMethod}
            onUpdate={loadSubscriptionData}
          />
        </div>

        <div className="space-y-6">
          <UpcomingInvoiceCard />
        </div>
      </div>

      <BillingHistoryCard />

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-2xl">
          <EmbeddedSubscriptionUpgrade
            targetPlan={targetPlan}
            onSuccess={handleUpgradeSuccess}
            onCancel={() => setShowUpgrade(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Cancellation Flow */}
      <CancellationFlow
        open={showCancel}
        onOpenChange={setShowCancel}
        onSuccess={handleCancelSuccess}
        currentPlan={subscription?.plan || 'free'}
      />
    </div>
  );
}
