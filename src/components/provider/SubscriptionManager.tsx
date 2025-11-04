import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, TrendingUp, Users, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Plan {
  id: string;
  name: string;
  price: number;
  feePercent: number;
  teamLimit: number;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    feePercent: 8.0,
    teamLimit: 5,
    features: ['Up to 5 clients', '8% transaction fee', 'Basic features'],
  },
  {
    id: 'beta',
    name: 'BETA Monthly',
    price: 15,
    feePercent: 3.0,
    teamLimit: 3,
    features: [
      '14-day free trial (no card required)',
      'Unlimited clients',
      '3% transaction fee',
      '3 team members',
      'Priority support',
      'All Pro features during beta'
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 29,
    feePercent: 2.5,
    teamLimit: 3,
    features: ['Unlimited clients', '2.5% transaction fee', '3 team members', 'Priority support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    feePercent: 2.0,
    teamLimit: 10,
    features: ['Everything in Growth', '2.0% transaction fee', '10 team members', 'Advanced analytics'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 299,
    feePercent: 2.0,
    teamLimit: 25,
    features: ['Everything in Pro', '25 team members', 'Custom integrations', 'Dedicated support'],
  },
];

interface SubscriptionManagerProps {
  currentPlan?: string;
  isAdmin?: boolean;
  onPlanChanged?: () => void;
}

export function SubscriptionManager({ currentPlan = 'free', isAdmin = false, onPlanChanged }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    // If admin, skip loading subscription details
    if (isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'get-subscription' },
      });

      if (error) throw error;
      
      // BUG-007 FIX: Fetch full subscription details from Stripe if available
      if (data?.subscription?.stripe_subscription_id) {
        const { data: stripeData } = await supabase.functions.invoke('payments-api', {
          body: { 
            action: 'get-stripe-subscription',
            subscriptionId: data.subscription.stripe_subscription_id,
          },
        });
        
        // Merge Stripe data with DB data
        setSubscription({
          ...data.subscription,
          cancel_at_period_end: stripeData?.subscription?.cancel_at_period_end,
        });
      } else {
        setSubscription(data?.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: subscription ? 'upgrade-plan' : 'create-subscription',
          plan: selectedPlan.id,
        },
      });

      if (error) throw error;

      // For beta plan with trial, redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // For immediate subscriptions (no trial)
      toast({
        title: 'Plan activated',
        description: `You're now on the ${selectedPlan.name} plan`,
      });
      setShowUpgradeDialog(false);
      loadSubscription();
      onPlanChanged?.();
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription failed',
        description: error.message || 'Failed to activate subscription',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const current = PLANS.find((p) => p.id === (isAdmin ? 'scale' : (subscription?.plan || currentPlan)));

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
          <CardTitle>Your Subscription</CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'You have full platform access as an administrator'
              : 'Manage your plan and transaction fees'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {current && (
            <div className="p-6 bg-muted rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">{current.name}</h3>
                    {isAdmin ? (
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        Admin Access
                      </Badge>
                    ) : subscription?.cancel_at_period_end ? (
                      <Badge variant="destructive">Canceling</Badge>
                    ) : (
                      <Badge variant={current.id === 'free' ? 'secondary' : 'default'}>Current Plan</Badge>
                    )}
                  </div>
                  {isAdmin ? (
                    <p className="text-muted-foreground">
                      Full platform access • No subscription required
                    </p>
                  ) : current.price > 0 ? (
                    <p className="text-muted-foreground">
                      {subscription?.cancel_at_period_end 
                        ? `Active until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                        : `$${current.price}/month`
                      }
                    </p>
                  ) : null}
                </div>
              </div>

              {isAdmin && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    🎉 Administrator Benefits
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    You have unrestricted access to all features, unlimited clients, team members, 
                    and the lowest transaction fees. No subscription charges apply to your account.
                  </p>
                </div>
              )}

              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {current.feePercent}% transaction fee
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    {isAdmin ? 'Unlimited team members' : `Up to ${current.teamLimit} team members`}
                  </span>
                </div>
              </div>

              {current.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}

          {!isAdmin && current?.id === 'free' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-semibold">Save 5.5% on every transaction</p>
                  <p className="text-muted-foreground">
                    Upgrade to Growth and keep more of your earnings
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {PLANS.filter((p) => p.id !== 'free').map((plan) => (
                  <Card key={plan.id} className="relative overflow-hidden">
                    {plan.id === 'growth' && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                        Popular
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-2xl font-bold">
                        ${plan.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /month
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-primary" />
                          <span className="font-semibold">
                            {plan.feePercent}% fees
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-primary" />
                          <span>{plan.teamLimit} team members</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUpgrade(plan)}
                        className="w-full"
                        variant={plan.id === 'growth' ? 'default' : 'outline'}
                      >
                        Upgrade
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!isAdmin && current && current.id !== 'free' && current.id !== 'scale' && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Want even lower fees and more features?
              </p>
              <div className="grid gap-4">
                {PLANS.filter(
                  (p) =>
                    p.price > (current?.price || 0) && p.id !== current?.id
                ).map((plan) => (
                  <Card key={plan.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{plan.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${plan.price}/month • {plan.feePercent}% fees
                        </p>
                      </div>
                      <Button onClick={() => handleUpgrade(plan)}>
                        Upgrade
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isAdmin && (
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Confirm your plan upgrade and payment details
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span>Plan</span>
                  <span className="font-semibold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Price</span>
                  <span className="font-semibold">
                    ${selectedPlan.price}/month
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Fee</span>
                  <span className="font-semibold text-primary">
                    {selectedPlan.feePercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Team Members</span>
                  <span className="font-semibold">
                    Up to {selectedPlan.teamLimit}
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                {selectedPlan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={confirmUpgrade} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Upgrade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      )}
    </>
  );
}
