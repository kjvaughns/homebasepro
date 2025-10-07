import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, CreditCard, ArrowUpRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [stats, setStats] = useState({
    activeClients: 0,
    monthlyRevenue: 0,
    teamMembers: 1,
  });

  useEffect(() => {
    loadProviderData();
  }, []);

  const loadProviderData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (orgError) {
        console.error("Error loading organization:", orgError);
        toast({
          title: "Setup Required",
          description: "Please complete your provider onboarding",
          variant: "destructive",
        });
        navigate("/onboarding/provider");
        return;
      }

      setOrganization(orgData);

      // Load subscription
      const { data: subData } = await supabase
        .from("organization_subscriptions")
        .select("*")
        .eq("organization_id", orgData.id)
        .eq("status", "active")
        .single();

      if (subData) {
        setSubscription(subData);

        // Load plan details
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("tier", subData.plan_tier)
          .single();

        setPlan(planData);
      }

      // Load stats
      if (orgData) {
        // Count active clients
        const { count: clientCount } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgData.id)
          .eq("status", "active");

        // Calculate monthly revenue
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const { data: paymentsData } = await supabase
          .from("payments")
          .select(`
            amount,
            client_subscriptions!inner (
              clients!inner (organization_id)
            )
          `)
          .eq("client_subscriptions.clients.organization_id", orgData.id)
          .eq("status", "completed")
          .gte("payment_date", thisMonth.toISOString());

        const monthlyRevenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;

        // Count team members
        const { count: teamCount } = await supabase
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgData.id)
          .eq("status", "active");

        setStats({
          activeClients: clientCount || 0,
          monthlyRevenue,
          teamMembers: (teamCount || 0) + 1, // +1 for owner
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "free": return "bg-muted";
      case "growth": return "bg-primary/20 text-primary";
      case "pro": return "bg-accent/20 text-accent";
      case "scale": return "bg-primary";
      default: return "bg-muted";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">Welcome back to your dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Clients</p>
              <p className="text-2xl font-bold">{stats.activeClients}</p>
              {plan?.client_limit && (
                <p className="text-xs text-muted-foreground">of {plan.client_limit} limit</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold">${(stats.monthlyRevenue / 100).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 p-3 rounded-lg">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">{stats.teamMembers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-auto py-6 flex-col items-start"
            onClick={() => navigate("/provider/clients")}
          >
            <Plus className="h-6 w-6 mb-2 text-primary" />
            <span className="font-semibold">Add Client</span>
            <span className="text-xs text-muted-foreground">Register a new customer</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-6 flex-col items-start"
            onClick={() => navigate("/provider/plans")}
          >
            <DollarSign className="h-6 w-6 mb-2 text-primary" />
            <span className="font-semibold">Create Plan</span>
            <span className="text-xs text-muted-foreground">Set up a service plan</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-6 flex-col items-start"
            onClick={() => navigate("/provider/payments")}
          >
            <TrendingUp className="h-6 w-6 mb-2 text-primary" />
            <span className="font-semibold">View Payments</span>
            <span className="text-xs text-muted-foreground">Track your revenue</span>
          </Button>
        </div>
      </Card>

      {/* Recent Activity & Upcoming Renewals */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity yet</p>
            <p className="text-sm mt-2">Activity will appear as you manage clients</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Renewals</h2>
          <div className="text-center py-8 text-muted-foreground">
            <p>No upcoming renewals</p>
            <p className="text-sm mt-2">Renewal notifications will appear here</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProviderDashboard;
