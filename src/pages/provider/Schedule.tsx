import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { UnifiedJobCard } from "@/components/provider/UnifiedJobCard";
import { JobDetailDrawer } from "@/components/provider/JobDetailDrawer";
import { JobsCalendar } from "@/components/provider/JobsCalendar";
import CreateJobModal from "@/components/provider/CreateJobModal";
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
  const [tab, setTab] = useState("week");

  useEffect(() => {
    loadJobs();
    setupPullToRefresh();
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
        .from("jobs" as any)
        .select(`
          *,
          clients(name, email, phone),
          service:services(name, default_price),
          invoice:invoices(id, status, amount)
        `)
        .eq("provider_org_id", org.id)
        .order("window_start", { ascending: true });

      // Filter by timeframe
      if (tab === "week") {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7*24*60*60*1000);
        query = query.gte("window_start", now.toISOString())
          .lt("window_start", weekEnd.toISOString());
      }

      const { data: jobsData } = await query;
      setJobs(jobsData || []);
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
            setShowCreateJob(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? 'New' : 'Create Job'}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => {
        triggerHaptic('light');
        setTab(value);
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="week" className="text-xs md:text-sm">This Week</TabsTrigger>
          <TabsTrigger value="all" className="text-xs md:text-sm">All Jobs</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs md:text-sm">
            <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-3 mt-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <p className="text-muted-foreground">No jobs scheduled this week</p>
              <Button onClick={() => {
                triggerHaptic('light');
                setShowCreateJob(true);
              }} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <p className="text-muted-foreground">No jobs found</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="h-[500px] md:h-[600px]">
            <JobsCalendar 
              jobs={jobs}
              onSelectJob={openJobDetail}
            />
          </div>
        </TabsContent>
      </Tabs>

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
