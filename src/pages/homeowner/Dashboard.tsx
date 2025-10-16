import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, Plus, Clock, CheckCircle2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallPromptDialog } from "@/components/pwa/InstallPromptDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AIAssistant from "@/components/ai/AIAssistant";

export default function HomeownerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const { canInstall, isInstalled, isIOS, promptInstall, dismissInstall } = usePWAInstall();
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    loadDashboardData();
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

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setNeedsProfile(true);
        setLoading(false);
        return;
      }

      setNeedsProfile(!profile.full_name || !profile.phone);
      setProfileId(profile.id);

      // Load active subscriptions with details
      const { data: subs } = await supabase
        .from("homeowner_subscriptions")
        .select(`
          *,
          service_plans(name, service_type),
          organizations(name),
          homes(name, address)
        `)
        .eq("homeowner_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setSubscriptions(subs || []);

      // Load upcoming visits
      const { data: visits } = await supabase
        .from("service_visits")
        .select(`
          *,
          homes(name, address),
          organizations(name)
        `)
        .eq("homeowner_id", profile.id)
        .eq("status", "scheduled")
        .gte("scheduled_date", new Date().toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(3);

      setUpcomingVisits(visits || []);

      // Load recent completed visits
      const { data: completed } = await supabase
        .from("service_visits")
        .select(`
          *,
          organizations(name),
          service_plans:service_request_id(name)
        `)
        .eq("homeowner_id", profile.id)
        .eq("status", "completed")
        .order("completion_time", { ascending: false })
        .limit(3);

      setRecentActivity(completed || []);
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
      <div className="container max-w-2xl py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6 px-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold">My Home</h1>
        <p className="text-muted-foreground text-sm">Manage your services</p>
      </div>

      {needsProfile && (
        <Card className="p-4 border-primary bg-primary/5">
          <p className="font-medium mb-2">Complete Your Profile</p>
          <Button 
            onClick={() => navigate("/homeowner/settings")}
            size="sm"
            className="w-full sm:w-auto"
          >
            Complete Setup
          </Button>
        </Card>
      )}

      {/* Active Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Services</h2>
          {subscriptions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/homeowner/subscriptions")}>
              View all
            </Button>
          )}
        </div>

        {subscriptions.length === 0 ? (
          <Card className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Get started in 3 easy steps:</p>
            <div className="space-y-2 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0">1</Badge>
                <span className="text-sm">Add your property</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0">2</Badge>
                <span className="text-sm">Browse service providers</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="shrink-0">3</Badge>
                <span className="text-sm">Book your first service</span>
              </div>
            </div>
            <Button onClick={() => navigate("/homeowner/homes/new")} className="mt-4">
              Add Your First Property
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <Card
                key={sub.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                onClick={() => navigate(`/homeowner/subscriptions/${sub.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sub.service_plans?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {sub.organizations?.name}
                      </p>
                      {sub.next_service_date && (
                        <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
                          Next: {new Date(sub.next_service_date).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Now CTA */}
      <Button
        onClick={() => navigate("/homeowner/browse")}
        className="w-full h-14 text-base"
        size="lg"
      >
        <Plus className="mr-2 h-5 w-5" />
        Schedule New Service
      </Button>

      {/* Upcoming Appointments */}
      {upcomingVisits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
          <div className="space-y-2">
            {upcomingVisits.map((visit) => (
              <Card
                key={visit.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/homeowner/appointments/${visit.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/10 p-2 rounded-lg">
                      <Clock className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{visit.organizations?.name}</p>
                      <p className="text-xs text-muted-foreground">{visit.homes?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      {new Date(visit.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(visit.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <Card key={activity.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.organizations?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Completed {new Date(activity.completion_time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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

      {/* AI Assistant Button */}
      <Button
        onClick={() => setShowAI(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* AI Assistant Dialog */}
      <Dialog open={showAI} onOpenChange={setShowAI}>
        <DialogContent className="max-w-2xl h-[600px] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>HomeBase AI Assistant</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(100%-80px)]">
            <AIAssistant />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
