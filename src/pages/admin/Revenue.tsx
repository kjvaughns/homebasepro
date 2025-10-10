import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CreditCard, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import StatsCard from "@/components/admin/StatsCard";

interface RevenueData {
  providerSubscriptionMRR: number;
  transactionFeeMRR: number;
  totalMRR: number;
  totalARR: number;
  freeProviders: number;
  growthProviders: number;
  proProviders: number;
  scaleProviders: number;
  avgTransactionFee: number;
  topProviders: Array<{
    name: string;
    revenue: number;
    tier: string;
  }>;
}

const TIER_COLORS = {
  free: "#94a3b8",
  growth: "#22c55e",
  pro: "#3b82f6",
  scale: "#a855f7",
};

const Revenue = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RevenueData>({
    providerSubscriptionMRR: 0,
    transactionFeeMRR: 0,
    totalMRR: 0,
    totalARR: 0,
    freeProviders: 0,
    growthProviders: 0,
    proProviders: 0,
    scaleProviders: 0,
    avgTransactionFee: 0,
    topProviders: [],
  });
  const [creditExpenses, setCreditExpenses] = useState<any[]>([]);
  const [outstandingLiability, setOutstandingLiability] = useState(0);
  const [currentMonthExpense, setCurrentMonthExpense] = useState<any>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        // Provider Subscription Revenue
        const { data: orgSubs } = await supabase
          .from("organization_subscriptions")
          .select(`
            plan_tier,
            organization_id,
            organizations!inner(name),
            subscription_plans!inner(price_monthly)
          `)
          .eq("status", "active");

        const providerSubscriptionMRR = orgSubs?.reduce(
          (sum, sub) => sum + (sub.subscription_plans?.price_monthly || 0),
          0
        ) || 0;

        // Count by tier
        const freeProviders = orgSubs?.filter(s => s.plan_tier === "free").length || 0;
        const growthProviders = orgSubs?.filter(s => s.plan_tier === "growth").length || 0;
        const proProviders = orgSubs?.filter(s => s.plan_tier === "pro").length || 0;
        const scaleProviders = orgSubs?.filter(s => s.plan_tier === "scale").length || 0;

        // Transaction Fee Revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: payments } = await supabase
          .from("payments")
          .select("fee_amount, fee_percent, client_subscription_id")
          .eq("status", "completed")
          .gte("payment_date", thirtyDaysAgo.toISOString());

        const transactionFeeMRR = payments?.reduce(
          (sum, payment) => sum + (payment.fee_amount || 0),
          0
        ) || 0;

        const avgTransactionFee = payments?.length 
          ? payments.reduce((sum, p) => sum + Number(p.fee_percent || 0), 0) / payments.length
          : 0;

        // Top providers by transaction volume
        const { data: clientSubs } = await supabase
          .from("client_subscriptions")
          .select(`
            client_id,
            clients!inner(name, organization_id),
            service_plans!inner(price)
          `)
          .eq("status", "active")
          .limit(10);

        const providerRevenue = new Map<string, { name: string; revenue: number; tier: string }>();
        
        for (const sub of clientSubs || []) {
          const orgId = sub.clients?.organization_id;
          if (!orgId) continue;
          
          const org = orgSubs?.find(o => o.organization_id === orgId);
          if (!org) continue;

          const existing = providerRevenue.get(orgId) || { 
            name: org.organizations?.name || "Unknown", 
            revenue: 0, 
            tier: org.plan_tier 
          };
          
          existing.revenue += sub.service_plans?.price || 0;
          providerRevenue.set(orgId, existing);
        }

        const topProviders = Array.from(providerRevenue.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        const totalMRR = providerSubscriptionMRR + transactionFeeMRR;

        setData({
          providerSubscriptionMRR,
          transactionFeeMRR,
          totalMRR,
          totalARR: totalMRR * 12,
          freeProviders,
          growthProviders,
          proProviders,
          scaleProviders,
          avgTransactionFee,
          topProviders,
        });

        // Fetch credit expenses
        const { data: expensesData } = await supabase
          .from("admin_credit_expenses")
          .select("*")
          .order("month", { ascending: false })
          .limit(12);

        setCreditExpenses(expensesData || []);
        setCurrentMonthExpense(expensesData?.[0] || null);
        
        const outstanding = expensesData?.reduce(
          (sum, month) => sum + (Number(month.outstanding_liability) || 0),
          0
        ) || 0;
        setOutstandingLiability(outstanding);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  const tierDistribution = [
    { name: "Free (8%)", value: data.freeProviders, color: TIER_COLORS.free, tier: "free" },
    { name: "Growth (2.5%)", value: data.growthProviders, color: TIER_COLORS.growth, tier: "growth" },
    { name: "Pro (2%)", value: data.proProviders, color: TIER_COLORS.pro, tier: "pro" },
    { name: "Scale (1.5%)", value: data.scaleProviders, color: TIER_COLORS.scale, tier: "scale" },
  ].filter(item => item.value > 0);

  const revenueBreakdown = [
    { name: "Provider Subs", value: data.providerSubscriptionMRR / 100, color: "#3b82f6" },
    { name: "Transaction Fees", value: data.transactionFeeMRR / 100, color: "#22c55e" },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Revenue Analytics</h1>
        <p className="text-muted-foreground text-sm md:text-base">Detailed platform revenue breakdown and insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total MRR"
          value={`$${(data.totalMRR / 100).toFixed(2)}`}
          description="Total Monthly Recurring Revenue"
          icon={DollarSign}
        />
        <StatsCard
          title="Provider Subs MRR"
          value={`$${(data.providerSubscriptionMRR / 100).toFixed(2)}`}
          description="From subscription plans"
          icon={CreditCard}
        />
        <StatsCard
          title="Transaction Fee MRR"
          value={`$${(data.transactionFeeMRR / 100).toFixed(2)}`}
          description={`Avg ${data.avgTransactionFee.toFixed(1)}% fee`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Total ARR"
          value={`$${(data.totalARR / 100).toFixed(2)}`}
          description="Annual Recurring Revenue"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Revenue Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Provider Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Top Providers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topProviders.length > 0 ? (
                data.topProviders.map((provider, index) => (
                  <div key={index} className="flex items-center justify-between pb-2 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs md:text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <span className="text-xs md:text-sm truncate">{provider.name}</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs shrink-0"
                        style={{ 
                          borderColor: TIER_COLORS[provider.tier as keyof typeof TIER_COLORS],
                          color: TIER_COLORS[provider.tier as keyof typeof TIER_COLORS]
                        }}
                      >
                        {provider.tier}
                      </Badge>
                    </div>
                    <span className="text-xs md:text-sm font-semibold shrink-0 ml-2">
                      ${(provider.revenue / 100).toFixed(0)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs md:text-sm text-muted-foreground text-center py-4">No provider data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Plan Tier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 p-4 rounded-lg border" style={{ borderColor: TIER_COLORS.free }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Free Plan</span>
                <Badge variant="secondary">{data.freeProviders}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">$0/mo + 8% transaction fee</p>
              <p className="text-lg font-bold">${((data.freeProviders * 0) / 100).toFixed(0)}/mo</p>
            </div>
            <div className="space-y-2 p-4 rounded-lg border" style={{ borderColor: TIER_COLORS.growth }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Growth Plan</span>
                <Badge variant="secondary">{data.growthProviders}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">$49/mo + 2.5% transaction fee</p>
              <p className="text-lg font-bold">${((data.growthProviders * 4900) / 100).toFixed(0)}/mo</p>
            </div>
            <div className="space-y-2 p-4 rounded-lg border" style={{ borderColor: TIER_COLORS.pro }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pro Plan</span>
                <Badge variant="secondary">{data.proProviders}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">$129/mo + 2% transaction fee</p>
              <p className="text-lg font-bold">${((data.proProviders * 12900) / 100).toFixed(0)}/mo</p>
            </div>
            <div className="space-y-2 p-4 rounded-lg border" style={{ borderColor: TIER_COLORS.scale }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Scale Plan</span>
                <Badge variant="secondary">{data.scaleProviders}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">$299/mo + 1.5% transaction fee</p>
              <p className="text-lg font-bold">${((data.scaleProviders * 29900) / 100).toFixed(0)}/mo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Liabilities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Referral Credit Liabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Outstanding Credits</p>
              <p className="text-2xl font-bold text-destructive">
                ${(outstandingLiability / 100).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Unredeemed service credits</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Redeemed This Month</p>
              <p className="text-2xl font-bold text-primary">
                ${currentMonthExpense ? (Number(currentMonthExpense.expense_realized) / 100).toFixed(0) : '0'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentMonthExpense?.credits_redeemed || 0} credits applied
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Issued (Lifetime)</p>
              <p className="text-2xl font-bold">
                ${creditExpenses.reduce((sum, m) => sum + (Number(m.total_expense) / 100), 0).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {creditExpenses.reduce((sum, m) => sum + Number(m.credits_issued || 0), 0)} total credits
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Revenue;
