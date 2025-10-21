import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/admin/StatsCard";
import { Users, DollarSign, TrendingUp, UserPlus, Building2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DashboardFilters } from "@/components/admin/DashboardFilters";
import { useToast } from "@/hooks/use-toast";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallPromptDialog } from "@/components/pwa/InstallPromptDialog";
import { useMobileLayout } from "@/hooks/useMobileLayout";

interface DashboardStats {
  totalWaitlist: number;
  totalUsers: number;
  totalHomeowners: number;
  totalProviders: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  projectedRevenue: number;
  providerSubscriptionMRR: number;
  transactionFeeMRR: number;
  freeProviderCount: number;
}

const Dashboard = () => {
  const { isMobile } = useMobileLayout();
  const [stats, setStats] = useState<DashboardStats>({
    totalWaitlist: 0,
    totalUsers: 0,
    totalHomeowners: 0,
    totalProviders: 0,
    activeSubscriptions: 0,
    mrr: 0,
    arr: 0,
    projectedRevenue: 0,
    providerSubscriptionMRR: 0,
    transactionFeeMRR: 0,
    freeProviderCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const { toast } = useToast();
  const { canInstall, isInstalled, isIOS, promptInstall, dismissInstall } = usePWAInstall();
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch waitlist count
        const { count: waitlistCount } = await supabase
          .from("waitlist")
          .select("*", { count: "exact", head: true });

        // Fetch user counts
        const { data: profiles } = await supabase.from("profiles").select("user_type");
        const homeowners = profiles?.filter((p) => p.user_type === "homeowner").length || 0;
        const providers = profiles?.filter((p) => p.user_type === "provider").length || 0;

        // Revenue Stream #1: Provider Subscription Fees (MRR from providers)
        const { data: orgSubs } = await supabase
          .from("organization_subscriptions")
          .select(`
            plan_tier,
            subscription_plans!inner(price_monthly)
          `)
          .eq("status", "active");

        const providerSubscriptionMRR = orgSubs?.reduce(
          (sum, sub) => sum + (sub.subscription_plans?.price_monthly || 0),
          0
        ) || 0;

        // Revenue Stream #2: Transaction Fees from Client Payments (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: payments } = await supabase
          .from("payments")
          .select("fee_amount, payment_date")
          .eq("status", "completed")
          .gte("payment_date", thirtyDaysAgo.toISOString());

        const transactionFeeMRR = payments?.reduce(
          (sum, payment) => sum + (payment.fee_amount || 0),
          0
        ) || 0;

        // Total Platform MRR = Provider Subscriptions + Transaction Fees
        const totalMRR = providerSubscriptionMRR + transactionFeeMRR;
        const totalARR = totalMRR * 12;

        // Count free providers
        const { count: freeProviderCount } = await supabase
          .from("organization_subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .eq("plan_tier", "free");

        // For projections: Estimate based on providers on free plan potentially upgrading
        // Assume 30% of free providers upgrade to Growth ($49/mo = 4900 cents)
        const projectedUpgradeRevenue = (freeProviderCount || 0) * 4900 * 0.3;

        // Assume active client subscriptions grow by 20%
        const { data: activeClientSubs } = await supabase
          .from("client_subscriptions")
          .select("service_plans!inner(price)")
          .eq("status", "active");

        const currentClientVolume = activeClientSubs?.reduce(
          (sum, sub) => sum + (sub.service_plans?.price || 0),
          0
        ) || 0;

        // Project 20% growth in transaction volume at avg 3% fee
        const projectedTransactionGrowth = currentClientVolume * 0.2 * 0.03;
        const projectedRevenue = projectedUpgradeRevenue + projectedTransactionGrowth;

        setStats({
          totalWaitlist: waitlistCount || 0,
          totalUsers: profiles?.length || 0,
          totalHomeowners: homeowners,
          totalProviders: providers,
          activeSubscriptions: orgSubs?.length || 0,
          mrr: totalMRR,
          arr: totalARR,
          projectedRevenue,
          providerSubscriptionMRR,
          transactionFeeMRR,
          freeProviderCount: freeProviderCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "organization_subscriptions" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-show install prompt after 30 seconds if not installed
  useEffect(() => {
    if (!loading && canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallDialog(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [loading, canInstall, isInstalled]);

  const userDistribution = [
    { name: "Homeowners", value: stats.totalHomeowners, color: "#8B5CF6" },
    { name: "Providers", value: stats.totalProviders, color: "#D946EF" },
  ];

  const handleExport = () => {
    // Create CSV content
    const csvContent = [
      ["Metric", "Value"],
      ["Total Waitlist", stats.totalWaitlist],
      ["Total Users", stats.totalUsers],
      ["Total Homeowners", stats.totalHomeowners],
      ["Total Providers", stats.totalProviders],
      ["Active Subscriptions", stats.activeSubscriptions],
      ["MRR", `$${(stats.mrr / 100).toFixed(2)}`],
      ["ARR", `$${(stats.arr / 100).toFixed(2)}`],
      ["Projected Revenue", `$${(stats.projectedRevenue / 100).toFixed(2)}`],
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-stats-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Dashboard data has been exported to CSV",
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your admin control center</p>
        </div>
      </div>

      <DashboardFilters onDateRangeChange={setDateRange} onExport={handleExport} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Waitlist"
          value={stats.totalWaitlist}
          description="Users waiting for access"
          icon={UserPlus}
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          description={`${stats.totalHomeowners} homeowners, ${stats.totalProviders} providers`}
          icon={Users}
        />
        <StatsCard
          title="Active Provider Plans"
          value={stats.activeSubscriptions}
          description="Providers with paid/free plans"
          icon={Calendar}
        />
        <StatsCard
          title="MRR"
          value={`$${(stats.mrr / 100).toFixed(2)}`}
          description="Monthly Recurring Revenue"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="ARR"
          value={`$${(stats.arr / 100).toFixed(2)}`}
          description="Annual Recurring Revenue"
          icon={TrendingUp}
        />
        <StatsCard
          title="Projected Revenue"
          value={`$${(stats.projectedRevenue / 100).toFixed(2)}`}
          description="30% free upgrade + 20% volume growth"
          icon={DollarSign}
        />
        <StatsCard
          title="Organizations"
          value={stats.totalProviders}
          description="Provider organizations"
          icon={Building2}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? "h-[250px]" : "h-[300px]"}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => isMobile ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userDistribution.map((entry, index) => (
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
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Provider Subscriptions</span>
              <span className="font-semibold">
                ${(stats.providerSubscriptionMRR / 100).toFixed(2)}/mo
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Transaction Fees</span>
              <span className="font-semibold">
                ${(stats.transactionFeeMRR / 100).toFixed(2)}/mo
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Avg Transaction Fee %</span>
              <span className="font-semibold">
                {stats.transactionFeeMRR > 0 && stats.activeSubscriptions > 0
                  ? '3.5%'
                  : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
              <span>Total Platform MRR</span>
              <span className="text-primary">${(stats.mrr / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Avg. Provider Revenue</span>
              <span className="font-semibold">
                ${stats.totalProviders > 0 
                  ? ((stats.mrr / stats.totalProviders) / 100).toFixed(2) 
                  : '0.00'}/mo
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Providers on Free Plan</span>
              <span className="font-semibold">{stats.freeProviderCount}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Transaction Fee Revenue %</span>
              <span className="font-semibold">
                {stats.mrr > 0 
                  ? ((stats.transactionFeeMRR / stats.mrr) * 100).toFixed(0)
                  : '0'}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">User to Provider Ratio</span>
              <span className="font-semibold">
                {stats.totalProviders > 0 ? (stats.totalHomeowners / stats.totalProviders).toFixed(1) : '0'}:1
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Install Prompt Dialog */}
      <InstallPromptDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
        isIOS={isIOS}
        onInstall={async () => {
          if (!isIOS) {
            const success = await promptInstall();
            if (success) {
              toast({ title: 'HomeBase installed!', description: 'You can now access HomeBase from your home screen' });
            }
          }
        }}
        onDismiss={dismissInstall}
      />
    </div>
  );
};

export default Dashboard;
