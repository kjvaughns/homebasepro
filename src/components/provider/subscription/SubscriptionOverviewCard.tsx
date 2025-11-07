import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionOverviewCardProps {
  subscription: any;
  onUpgrade: () => void;
  onCancel: () => void;
}

export function SubscriptionOverviewCard({ subscription, onUpgrade, onCancel }: SubscriptionOverviewCardProps) {
  const planNames: Record<string, string> = {
    free: "Free",
    beta: "Beta",
    growth: "Growth",
    pro: "Pro",
    scale: "Scale"
  };

  const planPrices: Record<string, string> = {
    free: "$0/month",
    beta: "$15/month",
    growth: "$49/month",
    pro: "$99/month",
    scale: "$199/month"
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trialing': return 'secondary';
      case 'canceled': return 'destructive';
      case 'past_due': return 'destructive';
      default: return 'outline';
    }
  };

  const currentPlan = subscription?.plan || 'free';
  const isCanceled = subscription?.cancel_at_period_end;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </div>
          <Badge variant={getStatusColor(subscription?.status)}>
            {subscription?.status || 'Free'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{planNames[currentPlan]}</h3>
            <p className="text-sm text-muted-foreground">{planPrices[currentPlan]}</p>
          </div>
          {currentPlan !== 'scale' && !isCanceled && (
            <Button onClick={onUpgrade} variant="default">
              Upgrade Plan
            </Button>
          )}
        </div>

        {subscription?.current_period_end && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {isCanceled ? 'Cancels on' : 'Renews on'}{' '}
              {format(new Date(subscription.current_period_end), 'MMM dd, yyyy')}
            </span>
          </div>
        )}

        {subscription?.trial_end && new Date(subscription.trial_end) > new Date() && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Trial Active</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your trial ends on {format(new Date(subscription.trial_end), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        )}

        {isCanceled && (
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">Subscription Ending</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Your subscription will end on {format(new Date(subscription.current_period_end), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentPlan !== 'free' && !isCanceled && (
          <Button onClick={onCancel} variant="ghost" className="w-full text-muted-foreground">
            Cancel Subscription
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
