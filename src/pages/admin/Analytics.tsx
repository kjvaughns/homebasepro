import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const Analytics = () => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch revenue summary
      const { data: revenue } = await supabase
        .from("admin_revenue_summary")
        .select("*")
        .order("month", { ascending: true })
        .limit(12);

      if (revenue) {
        const formattedRevenue = revenue.map((r) => ({
          month: new Date(r.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          mrr: (r.mrr / 100).toFixed(2),
          arr: (r.arr / 100).toFixed(2),
          subscriptions: r.subscription_count,
        }));
        setRevenueData(formattedRevenue);
      }

      // Fetch user growth
      const { data: users } = await supabase
        .from("admin_user_stats")
        .select("*")
        .order("date", { ascending: true })
        .limit(30);

      if (users) {
        const aggregated = users.reduce((acc: any, curr: any) => {
          const date = new Date(curr.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!acc[date]) {
            acc[date] = { date, homeowner: 0, provider: 0 };
          }
          acc[date][curr.user_type] = curr.count;
          return acc;
        }, {});
        setUserGrowth(Object.values(aggregated));
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your platform metrics</p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mrr" stroke="#8B5CF6" name="MRR ($)" />
                  <Line type="monotone" dataKey="subscriptions" stroke="#D946EF" name="Subscriptions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="homeowner" fill="#8B5CF6" name="Homeowners" />
                  <Bar dataKey="provider" fill="#D946EF" name="Providers" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
