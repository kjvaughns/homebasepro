import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { UnifiedJobCard } from "@/components/provider/UnifiedJobCard";
import { JobDetailDrawer } from "@/components/provider/JobDetailDrawer";
import { JobsCalendar } from "@/components/provider/JobsCalendar";
import CreateJobModal from "@/components/provider/CreateJobModal";
import { QuickAddSheet } from "@/components/provider/QuickAddSheet";
import { ScheduleStatsCard } from "@/components/provider/ScheduleStatsCard";
import { useScheduleStats } from "@/hooks/useScheduleStats";
import { toast } from "sonner";
import { syncJobToWorkflow } from "@/lib/workflow-sync";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useDespia } from "@/hooks/useDespia";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function Schedule() {
  const { triggerHaptic, showSpinner, hideSpinner } = useDespia();
  const isMobile = useIsMobile();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobEvents, setSelectedJobEvents] = useState<any[]>([]);
  const [selectedJobReviews, setSelectedJobReviews] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<'existing' | 'new' | 'block'>('existing');
  
  // Smart default view: mobile = day, desktop = week
  const getDefaultView = () => {
    const saved = localStorage.getItem('schedule_view');
    if (saved) return saved;
    return isMobile ? 'day' : 'week';
  };
  
  const [tab, setTab] = useState(getDefaultView());
  
  // Calculate schedule stats
  const stats = useScheduleStats(jobs);

  useEffect(() => {
    loadJobs();
    setupPullToRefresh();
    
    // Save view preference
    localStorage.setItem('schedule_view', tab);
    
    // Real-time subscription for job updates
    const channel = supabase
      .channel('schedule-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Job updated:', payload);
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab]);

  const setupPullToRefresh = () => {
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
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  };

  const loadJobs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      let query = supabase
        .from("bookings")
        .select(`
          *,
          clients(name, email, phone),
          invoice:invoices(id, status, amount)
        `)
        .eq("provider_org_id", org.id)
        .order("date_time_start", { ascending: true });

      // Filter by timeframe
      if (tab === "day") {
        const now = new Date();
        const dayEnd = new Date(now.getTime() + 24*60*60*1000);
        query = query.gte("date_time_start", now.toISOString())
          .lt("date_time_start", dayEnd.toISOString());
      } else if (tab === "week") {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7*24*60*60*1000);
        query = query.gte("date_time_start", now.toISOString())
          .lt("date_time_start", weekEnd.toISOString());
      } else if (tab === "month") {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        query = query.gte("date_time_start", monthStart.toISOString())
          .lt("date_time_start", monthEnd.toISOString());
      }
      // else tab === "list" shows all jobs (no filter)

      const { data: jobsData } = await query;
      
      // Map bookings fields to job fields for UI compatibility
      const mappedJobs = (jobsData || []).map((booking: any) => ({
        ...booking,
        window_start: booking.date_time_start,
        window_end: booking.date_time_end,
        service_type: booking.service_name
      }));
      
      setJobs(mappedJobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const handleRefresh = async () => {
    triggerHaptic('light');
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
    triggerHaptic('success');
    toast.success("Schedule refreshed");
  };

  const handleAction = async (jobId: string, action: string) => {
    triggerHaptic('light');
    showSpinner();
    try {
      if (action === "start") {
        await handleStatusUpdate(jobId, "start");
      } else if (action === "complete") {
        await handleStatusUpdate(jobId, "complete");
      } else if (action === "auto_invoice") {
        await handleAutoInvoice(jobId);
      }
      triggerHaptic('success');
    } catch (error) {
      console.error("Error handling action:", error);
      triggerHaptic('error');
      toast.error("Failed to perform action");
    } finally {
      hideSpinner();
    }
  };

  const handleAutoInvoice = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-invoice', {
        body: { bookingId: jobId }
      });

      if (error) throw error;

      if (data.already_exists) {
        toast.info("Invoice already exists for this job");
      } else {
        toast.success(`Invoice created!`, {
          action: {
            label: "View",
            onClick: () => window.location.href = `/provider/money?invoice=${data.invoice.id}`
          }
        });
      }

      loadJobs();
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  const handleStatusUpdate = async (jobId: string, action: string) => {
    const { error } = await supabase.functions.invoke("assistant-provider", {
      body: {
        message: `update_job_status for ${jobId} with action ${action}`,
        context: { job_id: jobId, action }
      }
    });

    if (error) throw error;
    
    try {
      const actionToStatusMap: Record<string, string> = {
        'start': 'in_progress',
        'complete': 'completed',
      };
      
      const jobStatus = actionToStatusMap[action] || action;
      await syncJobToWorkflow(jobId, jobStatus);
    } catch (workflowError) {
      console.error("Failed to sync workflow:", workflowError);
    }
    
    toast.success("Job updated");
    loadJobs();
  };

  const openJobDetail = async (job: any) => {
    triggerHaptic('light');
    setSelectedJob(job);
    
    const { data: events } = await supabase
      .from("job_events" as any)
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false });
    
    const { data: reviews } = await supabase
      .from("reviews" as any)
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false });
    
    setSelectedJobEvents(events || []);
    setSelectedJobReviews(reviews || []);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 rounded-2xl">
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 space-y-4 md:space-y-6 pb-safe">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">Your jobs & appointments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} ${!isMobile ? 'mr-2' : ''}`} />
            {!isMobile && 'Refresh'}
          </Button>
          <Button onClick={() => {
            triggerHaptic('light');
            if (isMobile) {
              setShowQuickAdd(true);
            } else {
              setShowCreateJob(true);
            }
          }}>
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? 'New' : 'Create Job'}
          </Button>
        </div>
      </div>

      {/* Daily Stats - show on day/week/month views */}
      {(tab === 'day' || tab === 'week' || tab === 'month') && jobs.length > 0 && (
        <ScheduleStatsCard
          todayJobCount={stats.todayJobCount}
          todayRevenue={stats.todayRevenue}
          completedCount={stats.completedCount}
          totalCount={stats.totalCount}
          progressPercentage={stats.progressPercentage}
          nextJob={stats.nextJob}
          onViewRoute={() => {
            // Navigate to today in calendar and trigger optimize
            setTab('month');
          }}
        />
      )}

      <div className="bg-card rounded-lg shadow-sm">
        <Tabs value={tab} onValueChange={(value) => {
          triggerHaptic('light');
          setTab(value);
        }}>
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
            <TabsTrigger value="day" className="text-xs md:text-sm data-[state=active]:bg-background">Day</TabsTrigger>
            <TabsTrigger value="week" className="text-xs md:text-sm data-[state=active]:bg-background">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs md:text-sm data-[state=active]:bg-background">
              <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs md:text-sm data-[state=active]:bg-background">List</TabsTrigger>
          </TabsList>

        <TabsContent value="day" className="space-y-3 mt-4 p-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No jobs today</h3>
              <p className="text-muted-foreground mb-4">You don't have any scheduled jobs for today</p>
              <Button onClick={() => {
                triggerHaptic('light');
                isMobile ? setShowQuickAdd(true) : setShowCreateJob(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="week" className="space-y-3 mt-4 p-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No jobs this week</h3>
              <p className="text-muted-foreground mb-4">You don't have any scheduled jobs for this week</p>
              <Button onClick={() => {
                triggerHaptic('light');
                isMobile ? setShowQuickAdd(true) : setShowCreateJob(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-3 mt-4 p-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job to get started</p>
              <Button onClick={() => {
                triggerHaptic('light');
                isMobile ? setShowQuickAdd(true) : setShowCreateJob(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="month" className="mt-4 p-4">
          <div className="h-[500px] md:h-[600px]">
            <JobsCalendar 
              jobs={jobs}
              onSelectJob={openJobDetail}
            />
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {showCreateJob && (
        <CreateJobModal
          open={showCreateJob}
          onOpenChange={(isOpen) => {
            if (!isOpen) triggerHaptic('light');
            setShowCreateJob(isOpen);
            if (!isOpen) loadJobs();
          }}
          onSuccess={() => {
            triggerHaptic('success');
            toast.success("Job created successfully");
            setShowCreateJob(false);
            loadJobs();
          }}
        />
      )}

      <QuickAddSheet
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onSelectMode={(mode) => {
          setQuickAddMode(mode);
          if (mode === 'existing' || mode === 'new') {
            setShowCreateJob(true);
          }
          // TODO: Implement 'block' mode for time blocking
        }}
      />

      {drawerOpen && selectedJob && (
        isMobile ? (
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-3xl">
              <div className="h-full overflow-y-auto">
                <JobDetailDrawer
                  job={selectedJob}
                  events={selectedJobEvents}
                  reviews={selectedJobReviews}
                  open={drawerOpen}
                  onClose={() => {
                    triggerHaptic('light');
                    setDrawerOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <JobDetailDrawer
            job={selectedJob}
            events={selectedJobEvents}
            reviews={selectedJobReviews}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        )
      )}
    </div>
  );
}
