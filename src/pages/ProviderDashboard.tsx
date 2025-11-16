import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Calendar, Plus, ChevronRight, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    monthlyRevenue: 0,
    projectedRevenue: 0,
    teamMembers: 1,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    loadProviderData();

    // Set up real-time listeners
    const channel = supabase
      .channel('provider-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'homeowner_subscriptions',
        },
        () => loadProviderData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_visits',
        },
        () => loadProviderData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProviderData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (orgError) {
        toast({
          title: "Setup Required",
          description: "Please complete your provider onboarding",
          variant: "destructive",
        });
        navigate("/onboarding/provider");
        return;
      }

      setOrganization(orgData);

      // Load stats - use homeowner_subscriptions for B2C revenue
      const { count: activeSubscribers } = await supabase
        .from("homeowner_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("provider_org_id", orgData.id)
        .eq("status", "active");

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // Calculate MRR from active homeowner subscriptions
      const { data: subscriptionsData } = await supabase
        .from("homeowner_subscriptions")
        .select("billing_amount")
        .eq("provider_org_id", orgData.id)
        .eq("status", "active");

      const monthlyRevenue = subscriptionsData?.reduce((sum, sub) => sum + sub.billing_amount, 0) || 0;
      const projectedRevenue = Math.floor(monthlyRevenue * 3 * 0.95); // 3 months ahead with 5% churn

      const { count: teamCount } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgData.id)
        .eq("status", "active");

      setStats({
        activeSubscribers: activeSubscribers || 0,
        monthlyRevenue,
        projectedRevenue,
        teamMembers: (teamCount || 0) + 1,
      });

      // Load upcoming appointments
      const { data: appointments } = await supabase
        .from("service_visits")
        .select(`
          *,
          homes(name, address),
          homeowner_subscriptions(
            service_plans(name, service_type)
          )
        `)
        .eq("provider_org_id", orgData.id)
        .in("status", ["pending", "confirmed"])
        .gte("scheduled_date", new Date().toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(5);

      setUpcomingAppointments(appointments || []);

      // Load recent payments as invoices
      const { data: invoices } = await supabase
        .from("payments")
        .select(`
          *,
          client_subscriptions(
            clients(name)
          )
        `)
        .eq("client_subscriptions.clients.organization_id", orgData.id)
        .order("payment_date", { ascending: false })
        .limit(5);

      setRecentInvoices(invoices || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'lawn_care': 'bg-primary/10 text-primary border-primary/20',
      'pest_control': 'bg-accent/10 text-accent border-accent/20',
      'hvac': 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back to {organization?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-4 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Active Subscribers</p>
              <p className="text-3xl font-bold">{stats.activeSubscribers}</p>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary"
                onClick={() => navigate("/provider/subscriptions")}
              >
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 p-4 rounded-xl">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Monthly Revenue (MRR)</p>
              <p className="text-3xl font-bold">${(stats.monthlyRevenue / 100).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Projected: ${(stats.projectedRevenue / 100).toFixed(0)} (3mo)
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-4 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Team Members</p>
              <p className="text-3xl font-bold">{stats.teamMembers}</p>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary"
                onClick={() => navigate("/provider/team")}
              >
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate("/provider/clients")}
          >
            <div className="bg-primary/10 p-3 rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-sm">Add Client</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate("/provider/plans")}
          >
            <div className="bg-primary/10 p-3 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-sm">Create Plan</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate("/provider/payments")}
          >
            <div className="bg-primary/10 p-3 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-sm">View Payments</span>
          </Button>
        </div>
      </Card>

      {/* Two Column Layout for Appointments & Invoices */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/provider/clients")}>
              View all
            </Button>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="bg-primary text-primary-foreground p-2 rounded-lg text-center min-w-[60px]">
                    <p className="text-xs font-medium">{new Date(apt.scheduled_date).toLocaleDateString('en-US', { month: 'short' })}</p>
                    <p className="text-2xl font-bold">{new Date(apt.scheduled_date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{apt.homes?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.homes?.address}</p>
                    {apt.homeowner_subscriptions?.service_plans?.service_type && (
                      <Badge variant="outline" className={`mt-1 text-xs ${getServiceTypeColor(apt.homeowner_subscriptions.service_plans.service_type)}`}>
                        {apt.homeowner_subscriptions.service_plans.name}
                      </Badge>
                    )}
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Invoices */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Invoices</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/provider/payments")}>
              View all
            </Button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No recent invoices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-accent/10 p-2 rounded-lg">
                      <FileText className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invoice.client_subscriptions?.clients?.name || 'Unknown Client'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${(invoice.amount / 100).toFixed(2)}</p>
                    <Badge variant={invoice.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProviderDashboard;
