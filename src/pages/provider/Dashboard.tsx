import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Bot, MapPin, ArrowRight, HelpCircle, Info, CreditCard } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderStats, useTodayJobs, useUnpaidInvoices, useUnrepliedMessages } from "./hooks/useDashboardData";
import { useDashboardInsights } from "./hooks/useDashboardInsights";
import { AIInsightCard } from "@/components/provider/AIInsightCard";
import { BalanceWidget } from "@/components/provider/BalanceWidget";
import { OnboardingChecklist } from "@/components/provider/OnboardingChecklist";
import { NewProviderWelcome } from "@/components/provider/NewProviderWelcome";
import { SetupWizard } from "@/components/provider/SetupWizard";
import { SetupChecklist } from "@/components/provider/SetupChecklist";
import { BusinessFlowWidget } from "@/components/provider/BusinessFlowWidget";
import { RemindersWidget } from "@/components/provider/RemindersWidget";
import { AIChatModal } from "@/components/ai/AIChatModal";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { stats, loading: kpiLoading } = useProviderStats();
  const { jobs } = useTodayJobs();
  const { invoices } = useUnpaidInvoices();
  const { threads: unreadThreads } = useUnrepliedMessages();
  const { insights, loading: insightsLoading } = useDashboardInsights();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  const hasAnyData = stats.totalClients > 0 || jobs.length > 0 || invoices.length > 0;

  useEffect(() => {
    loadUserProfile();
    checkStripeStatus();
    checkOrganization();
    
    // Check if returning from Stripe checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'complete') {
      toast.success("🎉 Subscription activated! Welcome to HomeBase Beta.");
      // Clear the URL parameter
      window.history.replaceState({}, '', '/provider/dashboard');
    }
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check admin status
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!adminRole);

    const { data } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at, onboarded_at, setup_completed, setup_completed_at')
      .eq('user_id', user.id)
      .single();

    setUserProfile(data as any);
    setUserPlan((data as any)?.plan || 'free');

    // Show setup wizard for new users who haven't completed setup
    if (data && !(data as any).setup_completed && (data as any).onboarded_at) {
      const onboardedRecently = new Date((data as any).onboarded_at) > new Date(Date.now() - 5*60*1000); // 5 minutes
      if (onboardedRecently) {
        setShowSetupWizard(true);
      }
    }
  };

  const checkStripeStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_account_id")
      .eq("owner_id", user.id)
      .single();

    setStripeConnected(!!org?.stripe_account_id);
  };

  const checkOrganization = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking organization:", error);
    }

    if (!org) {
      console.warn("No organization found for user. User may need to complete onboarding.");
    }
  };

  const isNewUser = userProfile?.onboarded_at && 
    new Date(userProfile.onboarded_at) > new Date(Date.now() - 24*60*60*1000);

  const trialDaysRemaining = userProfile?.trial_ends_at 
    ? Math.ceil((new Date(userProfile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-safe">
      <header className="py-4 md:py-6 pt-safe">
        <h1 className="font-bold tracking-tight" style={{ fontSize: "clamp(20px, 2.6vw, 32px)" }}>
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back! Here's an overview of your business.
        </p>
      </header>

      {/* Stripe Not Connected Banner */}
      {!stripeConnected && !isAdmin && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Action Required: Connect Stripe to Get Paid</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row md:items-center gap-3">
            <span className="flex-1">You can't receive payments until you connect Stripe. It only takes 2 minutes.</span>
            <Button size="sm" onClick={() => navigate('/provider/settings?tab=payments')} variant="secondary">
              <CreditCard className="h-4 w-4 mr-2" />
              Connect Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Checklist for incomplete setup */}
      {!userProfile?.setup_completed && (
        <div className="mb-6">
          <SetupChecklist onOpenWizard={() => setShowSetupWizard(true)} />
        </div>
      )}

      {/* Welcome state for new providers */}
      <NewProviderWelcome hasAnyData={hasAnyData} onOpenWizard={() => setShowSetupWizard(true)} />

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="Active Subscribers" value={stats.activeSubscribers} loading={kpiLoading} helpText="Homeowners with active subscriptions to your services" />
        <KpiCard title="Total Clients" value={stats.totalClients} loading={kpiLoading} helpText="All clients in your database (subscribers + non-subscribers)" />
        <KpiCard title="Monthly Revenue" value={`$${stats.mrr.toLocaleString()}`} loading={kpiLoading} helpText="Total revenue expected this month from subscriptions and jobs" />
        <KpiCard title="Upcoming (7d)" value={stats.upcoming7d} loading={kpiLoading} helpText="Number of jobs scheduled in the next 7 days" />
      </section>

      <div className="h-4 md:h-6" />

      {/* Business Flow */}
      <BusinessFlowWidget />

      <div className="h-4 md:h-6" />

      {/* Primary panels */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance Widget */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <BalanceWidget />
          </CardContent>
        </Card>

        {/* Today's route & jobs (2 cols) */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h3 className="font-semibold text-sm md:text-base">Today's Jobs & Route</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/provider/jobs")}
                >
                  <MapPin className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">View Map</span>
                </Button>
                <Button size="sm" onClick={() => navigate("/provider/jobs")}>
                  <Bot className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Optimize route</span>
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {jobs.slice(0, 6).map((j) => (
                <TodayJobRow key={j.id} job={j} onOpen={() => navigate(`/provider/jobs`)} />
              ))}
              {jobs.length === 0 && <EmptyRow text="No jobs scheduled today." />}
            </div>
          </CardContent>
        </Card>

      {/* AI insights */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-sm md:text-base">HomeBase AI · Insights</h3>
            <div className="mt-3 space-y-2">
              {insightsLoading ? (
                <div className="space-y-2">
                  <div className="animate-pulse rounded-md bg-muted h-16 w-full" />
                  <div className="animate-pulse rounded-md bg-muted h-16 w-full" />
                </div>
              ) : insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <AIInsightCard key={idx} title={insight.text} description={insight.text} type={insight.type} />
                ))
              ) : (
                <div className="text-center py-4">
                  <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No AI insights yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Insights will appear as you build your business
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4">
              {userPlan === 'free' ? (
                <Button 
                  className="w-full" 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/pricing')}
                >
                  Unlock AI (Upgrade to Pro)
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => setShowAIChat(true)}
                >
                  Ask HomeBase AI
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="h-4 md:h-6" />

      {/* Secondary panels */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Reminders Widget */}
        <div className="lg:col-span-2">
          <RemindersWidget />
        </div>

        <Card className="lg:col-span-2 rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm md:text-base">Unreplied Messages</h3>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => navigate("/provider/messages")}
              >
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {unreadThreads.slice(0, 5).map((t) => (
                <MessageThreadRow
                  key={t.id}
                  thread={t}
                  onOpen={() => navigate(`/provider/messages?conversation=${t.id}`)}
                />
              ))}
              {unreadThreads.length === 0 && <EmptyRow text="You're all caught up." />}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-sm md:text-base">Quick Links</h3>
            <div className="mt-3 grid gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/provider/settings")}>
                Set service rates
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/provider/settings")}>
                Connect calendar
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/provider/team")}>
                Invite teammate
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* AI Chat Modal */}
      <AIChatModal 
        open={showAIChat} 
        onOpenChange={setShowAIChat}
        userRole="provider"
      />

      {/* Setup Wizard */}
      <SetupWizard open={showSetupWizard} onClose={() => setShowSetupWizard(false)} />
    </div>
  );
}

function KpiCard({ title, value, loading, helpText }: { 
  title: string; 
  value: React.ReactNode; 
  loading?: boolean;
  helpText?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{title}</p>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mt-1" />
        ) : (
          <p className="text-xl md:text-2xl font-semibold mt-1">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TodayJobRow({ job, onOpen }: { job: any; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-sm">{job?.service_name || "Untitled Job"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {job?.address || "Address not available"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right hidden md:block">
          <p className="text-sm">{formatWindow(job)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Open
        </Button>
      </div>
    </div>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border p-3 text-sm flex items-start gap-2">
      <Bot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <span className="flex-1 text-xs md:text-sm">{text}</span>
    </div>
  );
}

function MessageThreadRow({ thread, onOpen }: { thread: any; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-sm">{thread?.title || "Conversation"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {thread?.last_message_preview || "No preview available"}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onOpen} className="shrink-0">
        Open
      </Button>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border p-3 text-sm text-muted-foreground text-center">
      {text}
    </div>
  );
}

function formatWindow(j: any) {
  try {
    const a = new Date(j.date_time_start);
    const b = new Date(j.date_time_end);
    return `${a.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${b.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
}
