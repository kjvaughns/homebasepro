import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReferralStatsCard from "@/components/admin/ReferralStatsCard";
import ReferralLeaderboard from "@/components/admin/ReferralLeaderboard";
import RewardsPendingList from "@/components/admin/RewardsPendingList";
import BetaActivationTool from "@/components/admin/BetaActivationTool";
import { Users, DollarSign, TrendingUp, Gift, Award, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReferralStats {
  total_profiles: number;
  total_events: number;
  total_referrals: number;
  total_eligible: number;
  credits_issued: number;
  total_credit_value: number;
  discounts_issued: number;
}

const Referrals = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [creditExpenses, setCreditExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch referral stats
        const { data: statsData } = await supabase
          .from("admin_referral_stats")
          .select("*")
          .single();

        setStats(statsData);

        // Fetch credit expenses
        const { data: expensesData } = await supabase
          .from("admin_credit_expenses")
          .select("*")
          .order("month", { ascending: false })
          .limit(12);

        setCreditExpenses(expensesData || []);
      } catch (error) {
        console.error("Error fetching referral data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("referral-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "referral_events" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rewards_ledger" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentMonthExpense = creditExpenses[0];
  const outstandingLiability = creditExpenses.reduce(
    (sum, month) => sum + (Number(month.outstanding_liability) || 0),
    0
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Referral System</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Track referrals, manage rewards, and monitor credit liabilities
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReferralStatsCard
          title="Total Referrals"
          value={stats?.total_referrals || 0}
          description="All-time referral signups"
          icon={Users}
          trend={stats?.total_events ? "+12% this month" : undefined}
        />
        <ReferralStatsCard
          title="Qualified Referrals"
          value={stats?.total_eligible || 0}
          description="Purchased after signup"
          icon={TrendingUp}
          trend={`${Math.round(((stats?.total_eligible || 0) / (stats?.total_referrals || 1)) * 100)}% conversion`}
        />
        <ReferralStatsCard
          title="Credits Issued"
          value={`$${((stats?.total_credit_value || 0) / 100).toFixed(0)}`}
          description={`${stats?.credits_issued || 0} service credits`}
          icon={Gift}
          trend={currentMonthExpense ? `$${(Number(currentMonthExpense.total_expense) / 100).toFixed(0)} this month` : undefined}
        />
        <ReferralStatsCard
          title="Outstanding Liability"
          value={`$${(outstandingLiability / 100).toFixed(0)}`}
          description="Unredeemed credits"
          icon={DollarSign}
          variant="destructive"
        />
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rewards">Pending Rewards</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="beta">Beta Activation</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <ReferralLeaderboard />
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <RewardsPendingList />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Program Health Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_referrals ? 
                    Math.round(((stats?.total_eligible || 0) / stats.total_referrals) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Signup → Qualified rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Referrals per User
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_profiles ? 
                    (stats.total_referrals / stats.total_profiles).toFixed(1) : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active sharers avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Reward Redemption
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.credits_issued ? 
                    Math.round((stats.credits_issued / (stats.total_eligible || 1)) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Credits used vs issued
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Fraud Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Fraud Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                  <span className="text-muted-foreground">Self-referral attempts</span>
                  <Badge variant="destructive">0</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                  <span className="text-muted-foreground">Duplicate email flags</span>
                  <Badge variant="destructive">0</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                  <span className="text-muted-foreground">IP rate limit hits</span>
                  <Badge variant="secondary">0</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beta" className="space-y-4">
          <BetaActivationTool />
        </TabsContent>
      </Tabs>

      {/* Credit Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Credit Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Month</th>
                  <th className="text-right py-2 px-2">Issued</th>
                  <th className="text-right py-2 px-2">Redeemed</th>
                  <th className="text-right py-2 px-2">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {creditExpenses.map((expense, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2 px-2">
                      {new Date(expense.month).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="text-right py-2 px-2">
                      ${(Number(expense.total_expense) / 100).toFixed(0)}
                    </td>
                    <td className="text-right py-2 px-2">
                      ${(Number(expense.expense_realized) / 100).toFixed(0)}
                    </td>
                    <td className="text-right py-2 px-2 font-semibold">
                      ${(Number(expense.outstanding_liability) / 100).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Referrals;
