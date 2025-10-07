import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "1y">("30d");
  
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    revenueChange: 0,
    activeClients: 0,
    clientsChange: 0,
    avgTransactionValue: 0,
    avgChange: 0,
    completedServices: 0,
    servicesChange: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [clientGrowthData, setClientGrowthData] = useState<any[]>([]);
  const [serviceTypeData, setServiceTypeData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (!org) {
        toast({
          title: "Organization not found",
          description: "Please complete your provider setup",
          variant: "destructive",
        });
        navigate("/onboarding/provider");
        return;
      }

      setOrganizationId(org.id);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === "30d") startDate.setDate(startDate.getDate() - 30);
      else if (timeRange === "90d") startDate.setDate(startDate.getDate() - 90);
      else startDate.setFullYear(startDate.getFullYear() - 1);

      // Load payments data
      const { data: payments } = await supabase
        .from("payments")
        .select(`
          *,
          client_subscriptions!inner (
            clients!inner (organization_id)
          )
        `)
        .eq("client_subscriptions.clients.organization_id", org.id)
        .gte("payment_date", startDate.toISOString())
        .order("payment_date", { ascending: true });

      // Calculate metrics
      const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const avgTransactionValue = payments?.length ? totalRevenue / payments.length : 0;

      // Load clients
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", org.id)
        .eq("status", "active");

      // Calculate revenue by month
      const revenueByMonth = payments?.reduce((acc: any, payment) => {
        const month = new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short' });
        if (!acc[month]) acc[month] = 0;
        acc[month] += payment.amount / 100;
        return acc;
      }, {});

      const revenueChartData = Object.entries(revenueByMonth || {}).map(([month, revenue]) => ({
        month,
        revenue,
      }));

      // Calculate client growth (mock data for now)
      const clientGrowthChartData = generateClientGrowthData(timeRange);

      // Service type distribution (mock data)
      const serviceDistribution = [
        { name: "Monthly Plans", value: 45, color: "hsl(var(--primary))" },
        { name: "One-time Services", value: 30, color: "hsl(var(--accent))" },
        { name: "Add-ons", value: 25, color: "hsl(var(--muted))" },
      ];

      setMetrics({
        totalRevenue,
        revenueChange: 12.5, // Mock percentage
        activeClients: clients?.length || 0,
        clientsChange: 8.3, // Mock percentage
        avgTransactionValue,
        avgChange: -2.1, // Mock percentage
        completedServices: payments?.length || 0,
        servicesChange: 15.7, // Mock percentage
      });

      setRevenueData(revenueChartData);
      setClientGrowthData(clientGrowthChartData);
      setServiceTypeData(serviceDistribution);

    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateClientGrowthData = (range: string) => {
    const months = range === "30d" ? 4 : range === "90d" ? 12 : 12;
    const data = [];
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - i - 1));
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        clients: Math.floor(Math.random() * 20) + 10 + i * 2,
      });
    }
    return data;
  };

  if (loading) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your business performance and insights</p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics.totalRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {metrics.revenueChange > 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{metrics.revenueChange}%</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{metrics.revenueChange}%</span>
                </>
              )}
              <span>from last period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeClients}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{metrics.clientsChange}%</span>
              <span>from last period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics.avgTransactionValue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {metrics.avgChange > 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{metrics.avgChange}%</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{metrics.avgChange}%</span>
                </>
              )}
              <span>from last period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Services</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedServices}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{metrics.servicesChange}%</span>
              <span>from last period</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Growth</CardTitle>
            <CardDescription>Active clients over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="clients" 
                  fill="hsl(var(--accent))" 
                  name="Clients"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Service Type</CardTitle>
          <CardDescription>Distribution of revenue across service categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
