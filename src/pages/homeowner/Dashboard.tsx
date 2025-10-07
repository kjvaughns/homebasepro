import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Calendar, DollarSign, Plus, Search, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HomeownerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0,
    activeSubscriptions: 0,
    upcomingVisits: 0,
    monthlySpend: 0,
  });
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile not found",
          description: "Please complete your profile setup",
          variant: "destructive",
        });
        return;
      }

      setProfileId(profile.id);

      // Get properties count
      const { count: propertiesCount } = await supabase
        .from("homes")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", profile.id);

      // Get active subscriptions count
      const { count: subscriptionsCount } = await supabase
        .from("homeowner_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("homeowner_id", profile.id)
        .eq("status", "active");

      // Get upcoming visits (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: visits, count: visitsCount } = await supabase
        .from("service_visits")
        .select(`
          *,
          homes(name, address),
          organizations(name)
        `)
        .eq("homeowner_id", profile.id)
        .eq("status", "scheduled")
        .lte("scheduled_date", sevenDaysFromNow.toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(5);

      setStats({
        properties: propertiesCount || 0,
        activeSubscriptions: subscriptionsCount || 0,
        upcomingVisits: visitsCount || 0,
        monthlySpend: 0, // TODO: Calculate from payments
      });

      setUpcomingVisits(visits || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome Home</h1>
        <p className="text-muted-foreground">Manage your properties and services</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties}</div>
            <p className="text-xs text-muted-foreground">Registered homes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Ongoing subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Visits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingVisits}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.monthlySpend / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Button onClick={() => navigate("/homeowner/homes/new")} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Home
          </Button>
          <Button onClick={() => navigate("/homeowner/browse")} variant="outline" className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Find Providers
          </Button>
          <Button onClick={() => navigate("/homeowner/appointments")} variant="outline" className="w-full">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Service
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Visits */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Visits</CardTitle>
          <CardDescription>Your scheduled service appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No upcoming visits scheduled
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/homeowner/appointments/${visit.id}`)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{visit.organizations?.name}</p>
                    <p className="text-sm text-muted-foreground">{visit.homes?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(visit.scheduled_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(visit.scheduled_date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest updates and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity to display
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
