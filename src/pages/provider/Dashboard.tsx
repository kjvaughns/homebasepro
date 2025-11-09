import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartToDos } from "@/components/provider/SmartToDos";
import { BalanceWidget } from "@/components/provider/BalanceWidget";
import { AIInsightCard } from "@/components/provider/AIInsightCard";
import { FloatingAIButton } from "@/components/provider/FloatingAIButton";
import { OnboardingChecklist } from "@/components/provider/OnboardingChecklist";
import { SetupChecklist } from "@/components/provider/SetupChecklist";
import { AIChatModal } from "@/components/ai/AIChatModal";
import { 
  DollarSign, 
  Briefcase,
  AlertCircle,
  ArrowRight,
  MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderStats, useTodayJobs, useUnpaidInvoices, useUnrepliedMessages } from "./hooks/useDashboardData";
import { useDespia } from "@/hooks/useDespia";
import { toast } from "sonner";

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { stats, loading: statsLoading } = useProviderStats();
  const { jobs, loading: jobsLoading } = useTodayJobs();
  const { invoices, loading: invoicesLoading } = useUnpaidInvoices();
  const { threads: unreadThreads, loading: messagesLoading } = useUnrepliedMessages();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useDespia();

  const loading = statsLoading || jobsLoading || invoicesLoading || messagesLoading;
  const hasAnyData = stats.totalClients > 0 || jobs.length > 0 || invoices.length > 0;

  useEffect(() => {
    loadUserProfile();
    checkStripeStatus();
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    setUserProfile(data);
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    
    await Promise.all([
      loadUserProfile(),
      checkStripeStatus()
    ]);
    
    toast.success("Dashboard refreshed");
    triggerHaptic('success');
    setIsRefreshing(false);
  };

  // Pull to refresh setup
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      
      if (distance > 100) {
        handleRefresh();
        pulling = false;
      }
    };

    const handleTouchEnd = () => {
      pulling = false;
      startY = 0;
      currentY = 0;
    };

    const element = pullToRefreshRef.current;
    if (element) {
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchmove', handleTouchMove);
      element.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="p-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      ) : (
        <>
          {!stripeConnected && (
            <Alert className="m-4 mb-0">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Stripe Not Connected</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>Connect Stripe to accept payments from customers</span>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    triggerHaptic('light');
                    navigate('/provider/settings?tab=payments');
                  }}
                >
                  Connect Now
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div 
            className="p-4 md:p-6 space-y-4 md:space-y-6"
            ref={pullToRefreshRef}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Welcome back, {userProfile?.full_name}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 🎯 Section 1: TODAY'S PRIORITIES */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎯 Today's Priorities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all min-h-[44px]"
                    onClick={() => {
                      triggerHaptic('light');
                      navigate('/provider/schedule');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Jobs to Complete</p>
                        <p className="text-sm text-muted-foreground">{jobs.length} jobs today</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </button>

                  <button
                    className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all min-h-[44px]"
                    onClick={() => {
                      triggerHaptic('light');
                      navigate('/provider/money');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Unpaid Invoices</p>
                        <p className="text-sm text-muted-foreground">{invoices.length} awaiting payment</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </button>

                  <button
                    className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all min-h-[44px]"
                    onClick={() => {
                      triggerHaptic('light');
                      navigate('/provider/messages');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Messages to Reply</p>
                        <p className="text-sm text-muted-foreground">{unreadThreads.length} unread</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </CardContent>
              </Card>

              {/* 💰 Section 2: THIS WEEK'S MONEY */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💰 This Week's Money
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BalanceWidget />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      className="h-12"
                      onClick={() => {
                        triggerHaptic('light');
                        navigate('/provider/money?action=send-invoice');
                      }}
                    >
                      Send Invoice
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12"
                      onClick={() => {
                        triggerHaptic('light');
                        navigate('/provider/money?action=record-payment');
                      }}
                    >
                      Record Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 📅 Section 3: UPCOMING SCHEDULE */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📅 Upcoming Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <p className="text-sm text-muted-foreground">Tomorrow</p>
                      <p className="text-2xl font-bold">{jobs.length}</p>
                      <p className="text-xs text-muted-foreground">jobs</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <p className="text-sm text-muted-foreground">This Week</p>
                      <p className="text-2xl font-bold">{stats.upcoming7d || 0}</p>
                      <p className="text-xs text-muted-foreground">jobs</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      className="h-12"
                      onClick={() => {
                        triggerHaptic('light');
                        navigate('/provider/schedule');
                      }}
                    >
                      View Calendar
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12"
                      onClick={() => {
                        triggerHaptic('light');
                        navigate('/provider/schedule?view=map');
                      }}
                    >
                      Optimize Route
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Smart To-Dos - Collapsible */}
              <SmartToDos />

              {/* AI Insights - Single Card */}
              <AIInsightCard
                title="Ask HomeBase AI"
                description="Get instant help with your business tasks and questions"
                type="tip"
                actionLabel="Open AI Chat"
                onAction={() => setShowAIChat(true)}
              />

              {!hasAnyData && <OnboardingChecklist />}
              {hasAnyData && <SetupChecklist />}
            </div>
          </div>

          <FloatingAIButton />
        </>
      )}

      {showAIChat && (
        <AIChatModal 
          open={showAIChat}
          onOpenChange={setShowAIChat}
        />
      )}
    </div>
  );
}
