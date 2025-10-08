import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/admin/StatsCard";
import { Users, DollarSign, TrendingUp, UserPlus, Building2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totalWaitlist: number;
  totalUsers: number;
  totalHomeowners: number;
  totalProviders: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  projectedRevenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalWaitlist: 0,
    totalUsers: 0,
    totalHomeowners: 0,
    totalProviders: 0,
    activeSubscriptions: 0,
    mrr: 0,
    arr: 0,
    projectedRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

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

        // Fetch subscription data
        const { data: subscriptions } = await supabase
          .from("homeowner_subscriptions")
          .select("billing_amount, status");

        const activeSubscriptions = subscriptions?.filter((s) => s.status === "active") || [];
        const mrr = activeSubscriptions.reduce((sum, sub) => sum + (sub.billing_amount || 0), 0);
        const arr = mrr * 12;

        // Calculate projected revenue (assuming 10% waitlist conversion rate)
        const avgSubscriptionValue = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;
        const projectedRevenue = (waitlistCount || 0) * avgSubscriptionValue * 0.1;

        setStats({
          totalWaitlist: waitlistCount || 0,
          totalUsers: (profiles?.length || 0),
          totalHomeowners: homeowners,
          totalProviders: providers,
          activeSubscriptions: activeSubscriptions.length,
          mrr,
          arr,
          projectedRevenue,
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
      .on("postgres_changes", { event: "*", schema: "public", table: "homeowner_subscriptions" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const userDistribution = [
    { name: "Homeowners", value: stats.totalHomeowners, color: "#8B5CF6" },
    { name: "Providers", value: stats.totalProviders, color: "#D946EF" },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your admin control center</p>
      </div>

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
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          description="Currently paying customers"
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
          description="Based on 10% waitlist conversion"
          icon={DollarSign}
        />
        <StatsCard
          title="Organizations"
          value={stats.totalProviders}
          description="Provider organizations"
          icon={Building2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
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
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Avg. Subscription Value</span>
              <span className="font-semibold">
                ${stats.activeSubscriptions > 0 ? ((stats.mrr / stats.activeSubscriptions) / 100).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">Conversion Rate Estimate</span>
              <span className="font-semibold">10%</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-muted-foreground">User to Provider Ratio</span>
              <span className="font-semibold">
                {stats.totalProviders > 0 ? (stats.totalHomeowners / stats.totalProviders).toFixed(1) : '0'}:1
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Platform Revenue</span>
              <span className="font-semibold text-primary">${(stats.mrr / 100).toFixed(2)}/mo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
