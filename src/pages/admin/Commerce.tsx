import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReferralLeaderboard from "@/components/admin/ReferralLeaderboard";
import RewardsPendingList from "@/components/admin/RewardsPendingList";

const defaultPlans = [
  {
    name: "Free Plan",
    subtitle: "Starter",
    priceMonthly: 0,
    priceAnnual: 0,
    clients: "Up to 5 clients",
    fee: "8% per transaction",
  },
  {
    name: "Growth",
    priceMonthly: 49,
    priceAnnual: 39,
    clients: "Up to 20 clients",
    fee: "2.5% per transaction",
  },
  {
    name: "Pro",
    priceMonthly: 129,
    priceAnnual: 103,
    clients: "Up to 50 clients",
    fee: "2.0% per transaction",
  },
  {
    name: "Scale",
    priceMonthly: 299,
    priceAnnual: 239,
    clients: "100+ clients",
    fee: "1.5% per transaction",
  },
];

export default function AdminCommerce() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Commerce</h1>
        <p className="text-sm text-muted-foreground">Manage referrals, pricing, discounts, and promo codes</p>
      </header>

      <Tabs defaultValue="referrals" className="w-full">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="codes">Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <ReferralLeaderboard />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <RewardsPendingList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <CardTitle>Subscription Pricing</CardTitle>
              <div className="inline-flex rounded-lg bg-muted p-1 self-start md:self-auto">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    billingPeriod === "monthly" ? "bg-background" : "text-muted-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("annual")}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    billingPeriod === "annual" ? "bg-background" : "text-muted-foreground"
                  }`}
                >
                  Annual
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {defaultPlans.map((plan) => (
                  <Card key={plan.name} className="p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {"subtitle" in plan && (plan as any).subtitle && (
                        <p className="text-xs text-muted-foreground">{(plan as any).subtitle}</p>
                      )}
                    </div>
                    <div className="text-2xl font-bold mb-2">
                      {plan.priceMonthly === 0 ? "$0" : billingPeriod === "monthly" ? `$${plan.priceMonthly}` : `$${plan.priceAnnual}`}
                      {plan.priceMonthly > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{plan.clients}</p>
                    <p className="text-sm text-accent mb-4">{plan.fee}</p>
                    <Button variant="outline" className="w-full" disabled>
                      Edit (coming soon)
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Discounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create and manage platform-wide discounts. (Coming soon)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Promo Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Generate custom codes to run promotions. (Coming soon)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
