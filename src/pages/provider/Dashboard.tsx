import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, Package, Calendar } from "lucide-react";

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeClients: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    upcomingAppointments: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get organization
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) return;

      // Get active subscriptions
      const { data: subscriptions } = await supabase
        .from('homeowner_subscriptions')
        .select('*')
        .eq('provider_org_id', org.id)
        .eq('status', 'active');

      // Calculate monthly revenue
      const monthlyRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.billing_amount || 0), 0) || 0;

      // Get unique clients
      const uniqueClients = new Set(subscriptions?.map(sub => sub.homeowner_id));

      // Get upcoming appointments (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const { data: appointments } = await supabase
        .from('service_visits')
        .select('*')
        .eq('provider_org_id', org.id)
        .gte('scheduled_date', today.toISOString())
        .lte('scheduled_date', nextWeek.toISOString())
        .in('status', ['scheduled', 'confirmed']);

      setStats({
        activeClients: uniqueClients.size,
        monthlyRevenue,
        activeSubscriptions: subscriptions?.length || 0,
        upcomingAppointments: appointments?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clients with active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Assistant Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help Managing Your Business?</CardTitle>
          <CardDescription>
            Ask HomeBase AI to help prioritize jobs, check your schedule, assist with quotes, or analyze your business performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the chat button in the bottom right to get started with your AI business assistant.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
