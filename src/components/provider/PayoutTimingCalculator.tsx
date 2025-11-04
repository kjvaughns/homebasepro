import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap } from "lucide-react";

interface PayoutTimingCalculatorProps {
  delayDays?: number;
}

export function PayoutTimingCalculator({ delayDays = 2 }: PayoutTimingCalculatorProps) {
  const getBusinessDay = (daysFromNow: number): string => {
    const date = new Date();
    let businessDaysAdded = 0;
    
    while (businessDaysAdded < daysFromNow) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysAdded++;
      }
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const standardPayoutDate = getBusinessDay(delayDays);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payout Timing</CardTitle>
        <CardDescription>
          When you'll receive funds from customer payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-medium">Standard Payout</div>
              <div className="text-sm text-muted-foreground">
                Payment received: <span className="font-medium text-foreground">{today}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Arrives in bank: <span className="font-medium text-foreground">{standardPayoutDate}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {delayDays} business days • No fee
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-medium">Instant Payout</div>
              <div className="text-sm text-muted-foreground">
                Arrives in: <span className="font-medium text-foreground">~30 minutes</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                1.5% fee • Requires debit card on file
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
          <p>• Business days exclude weekends and US bank holidays</p>
          <p>• Stripe's processing fee (2.9% + $0.30) is deducted from all payments</p>
          <p>• Platform fee varies by your subscription plan</p>
        </div>
      </CardContent>
    </Card>
  );
}
