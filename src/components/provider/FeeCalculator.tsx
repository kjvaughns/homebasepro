import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, DollarSign } from "lucide-react";

export const FeeCalculator = () => {
  const [jobAmount, setJobAmount] = useState(1000);

  const freePlanFee = jobAmount * 0.08;
  const proPlanFee = jobAmount * 0.03;
  const stripeFee = jobAmount * 0.029 + 0.30; // Stripe's 2.9% + $0.30
  const freeNetAmount = jobAmount - freePlanFee - stripeFee;
  const proNetAmount = jobAmount - proPlanFee - stripeFee;
  const savings = freePlanFee - proPlanFee;
  const monthlySubscription = 15;

  // Calculate break-even point
  const breakEvenAmount = monthlySubscription / 0.05; // $15 / 5% difference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Fee Calculator
        </CardTitle>
        <CardDescription>
          See how much you save with Pro vs Free plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="jobAmount">Job Amount ($)</Label>
          <Input
            id="jobAmount"
            type="number"
            min="0"
            step="100"
            value={jobAmount}
            onChange={(e) => setJobAmount(Number(e.target.value) || 0)}
            className="text-lg font-semibold"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Free Plan */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Free Plan</h3>
              <span className="text-xs font-medium px-2 py-1 bg-background rounded">8% fee</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Job Amount:</p>
              <p className="text-2xl font-bold">${jobAmount.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Platform Fee (8%):</p>
              <p className="text-lg font-semibold text-destructive">-${freePlanFee.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Stripe Fee (2.9% + $0.30):</p>
              <p className="text-sm font-semibold text-muted-foreground">-${stripeFee.toFixed(2)}</p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">You Receive:</p>
              <p className="text-2xl font-bold">${freeNetAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary rounded-lg p-4 space-y-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pro Plan</h3>
              <span className="text-xs font-medium px-2 py-1 bg-primary text-primary-foreground rounded">3% fee</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Job Amount:</p>
              <p className="text-2xl font-bold">${jobAmount.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Platform Fee (3%):</p>
              <p className="text-lg font-semibold text-primary">-${proPlanFee.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Stripe Fee (2.9% + $0.30):</p>
              <p className="text-sm font-semibold text-muted-foreground">-${stripeFee.toFixed(2)}</p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">You Receive:</p>
              <p className="text-2xl font-bold text-primary">${proNetAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Savings Display */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-primary">Your Savings with Pro</h4>
          </div>
          <p className="text-3xl font-bold text-primary">${savings.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            per ${jobAmount.toLocaleString()} job
          </p>
        </div>

        {/* Monthly Analysis */}
        <div className="space-y-3 text-sm bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold">Monthly Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">If you do 5 jobs/month at ${jobAmount}:</span>
              <span className="font-semibold">Total: ${(jobAmount * 5).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free plan fees:</span>
              <span className="text-destructive font-semibold">-${(freePlanFee * 5).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pro plan fees + subscription:</span>
              <span className="text-primary font-semibold">-${(proPlanFee * 5 + monthlySubscription).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="font-semibold">Monthly savings with Pro:</span>
              <span className="text-xl font-bold text-primary">
                ${((freePlanFee * 5) - (proPlanFee * 5 + monthlySubscription)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          <p>💡 Break-even point: Jobs totaling ${breakEvenAmount.toFixed(0)}/month</p>
          <p className="mt-1">Above that, Pro plan saves you money!</p>
          <p className="mt-2 text-xs opacity-75">Note: Stripe fees (2.9% + $0.30) apply to all transactions</p>
        </div>
      </CardContent>
    </Card>
  );
};
