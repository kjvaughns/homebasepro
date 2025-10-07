import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Users, DollarSign, TrendingUp, LogOut, CreditCard, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleSwitcher } from "@/components/RoleSwitcher";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

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
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">HomeBase</span>
          </div>
          <div className="flex items-center gap-4">
            <RoleSwitcher />
            <span className="text-sm text-muted-foreground">{organization?.name}</span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Current Plan Banner */}
        {plan && (
          <Card className="p-6 mb-8 border-2 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{plan.name}</h2>
                  <Badge className={getTierColor(plan.tier)}>
                    {plan.tier.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">
                  {plan.client_limit ? `Up to ${plan.client_limit} clients` : "Unlimited clients"} • {plan.transaction_fee_percent}% transaction fee
                </p>
                <div className="flex gap-4">
                  {plan.tier !== "scale" && (
                    <Button onClick={() => navigate("/pricing")} variant="default">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  )}
                  <Button variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Monthly Price</p>
                <p className="text-3xl font-bold">
                  ${(plan.price_monthly / 100).toFixed(0)}
                  <span className="text-lg text-muted-foreground">/mo</span>
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
          <p className="text-muted-foreground">Manage your business and customers</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold">0</p>
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
                <p className="text-2xl font-bold">$0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transaction Fees</p>
                <p className="text-2xl font-bold">{plan?.transaction_fee_percent || 0}%</p>
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
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-6 flex-col items-start">
              <Users className="h-6 w-6 mb-2 text-primary" />
              <span className="font-semibold">Add Client</span>
              <span className="text-xs text-muted-foreground">Register a new customer</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col items-start">
              <DollarSign className="h-6 w-6 mb-2 text-primary" />
              <span className="font-semibold">Create Plan</span>
              <span className="text-xs text-muted-foreground">Set up a subscription</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col items-start">
              <TrendingUp className="h-6 w-6 mb-2 text-primary" />
              <span className="font-semibold">View Analytics</span>
              <span className="text-xs text-muted-foreground">Track your growth</span>
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity yet</p>
            <p className="text-sm mt-2">Start adding clients to see activity here</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProviderDashboard;
