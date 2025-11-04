import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, DollarSign } from "lucide-react";

export const FeeCalculator = () => {
  const [jobAmount, setJobAmount] = useState(1000);

  // Plan fee percentages (Stripe's cut is separate)
  const freePlanFee = jobAmount * 0.08;   // 8% platform fee
  const proPlanFee = jobAmount * 0.03;    // 3% platform fee (trial)
  const growthPlanFee = jobAmount * 0.025; // 2.5% platform fee
  const proFullPlanFee = jobAmount * 0.02; // 2% platform fee
  const scalePlanFee = jobAmount * 0.015;  // 1.5% platform fee
  
  const freeNetAmount = jobAmount - freePlanFee;
  const proNetAmount = jobAmount - proPlanFee;
  const growthNetAmount = jobAmount - growthPlanFee;
  const proFullNetAmount = jobAmount - proFullPlanFee;
  const scaleNetAmount = jobAmount - scalePlanFee;
  
  const savings = freePlanFee - proPlanFee;
  const monthlySubscription = 0; // Free trial

  // Calculate break-even for Growth plan ($49/mo)
  const growthBreakEven = 49 / (0.08 - 0.025); // Subscription cost / fee difference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Fee Calculator
        </CardTitle>
        <CardDescription>
          Compare platform fees across plans (Stripe processing fees apply separately)
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
              <p className="text-xs text-muted-foreground italic">+ Stripe's processing fees</p>
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
              <p className="text-xs text-muted-foreground italic">+ Stripe's processing fees</p>
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

        {/* All Plans Comparison */}
        <div className="space-y-3 text-sm bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold">All Plans - Monthly Revenue: ${(jobAmount * 5).toLocaleString()}</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-medium">Free</span>
                <span className="text-xs text-muted-foreground ml-2">$0/mo</span>
              </div>
              <span className="font-semibold">Keep ${freeNetAmount.toFixed(2)}/job</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b bg-primary/5">
              <div>
                <span className="font-medium text-primary">Pro Trial</span>
                <span className="text-xs text-muted-foreground ml-2">14 days free</span>
              </div>
              <span className="font-semibold text-primary">Keep ${proNetAmount.toFixed(2)}/job</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-medium">Growth</span>
                <span className="text-xs text-muted-foreground ml-2">$49/mo</span>
              </div>
              <span className="font-semibold">Keep ${growthNetAmount.toFixed(2)}/job</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-medium">Pro</span>
                <span className="text-xs text-muted-foreground ml-2">$129/mo</span>
              </div>
              <span className="font-semibold">Keep ${proFullNetAmount.toFixed(2)}/job</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-medium">Scale</span>
                <span className="text-xs text-muted-foreground ml-2">$299/mo</span>
              </div>
              <span className="font-semibold">Keep ${scaleNetAmount.toFixed(2)}/job</span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t space-y-1">
          <p>💡 Growth plan break-even: ${growthBreakEven.toFixed(0)}/month in revenue</p>
          <p className="opacity-75">All plans include Stripe's standard processing fees</p>
        </div>
      </CardContent>
    </Card>
  );
};
