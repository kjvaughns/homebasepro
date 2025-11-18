import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionManager } from "@/components/provider/SubscriptionManager";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface BillingSectionProps {
  currentPlan: string;
  isAdmin: boolean;
  subscription: any;
  onPlanChanged: () => void;
  onManageSubscription: () => void;
}

const PLAN_FEES: Record<string, number> = {
  free: 8.0,
  starter: 4.0,
  pro: 2.0,
};

export function BillingSection({ 
  currentPlan, 
  isAdmin, 
  subscription,
  onPlanChanged,
  onManageSubscription
}: BillingSectionProps) {
  const [showPlans, setShowPlans] = useState(false);

  const getFeeForPlan = (plan: string) => PLAN_FEES[plan] || 8.0;

  return (
    <div className="space-y-4">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <p className="text-2xl font-bold mt-2 capitalize">{currentPlan}</p>
            </div>
            {!isAdmin && subscription && (
              <Badge variant={subscription.cancel_at_period_end ? "outline" : "default"}>
                {subscription.cancel_at_period_end ? 'Canceling' : 'Active'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Transaction Fee: <strong className="text-foreground">{getFeeForPlan(currentPlan)}%</strong>
            </p>
            {subscription?.current_period_end && (
              <p>
                Renews: <strong className="text-foreground">
                  {format(new Date(subscription.current_period_end * 1000), 'MMM d, yyyy')}
                </strong>
              </p>
            )}
          </div>

          {!isAdmin && (
            <div className="flex gap-2 pt-2">
              <Button onClick={onManageSubscription} size="sm">
                Manage Subscription
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPlans(!showPlans)}
              >
                {showPlans ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Plans
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    View Plans
                  </>
                )}
              </Button>
            </div>
          )}

          {isAdmin && (
            <p className="text-sm text-muted-foreground pt-2">
              Admin accounts don't have subscription billing
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison - Collapsible */}
      {showPlans && !isAdmin && (
        <SubscriptionManager 
          currentPlan={currentPlan}
          isAdmin={isAdmin}
          onPlanChanged={onPlanChanged}
        />
      )}
    </div>
  );
}
