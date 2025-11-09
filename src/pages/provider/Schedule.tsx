import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { UnifiedJobCard } from "@/components/provider/UnifiedJobCard";
import { JobDetailDrawer } from "@/components/provider/JobDetailDrawer";
import { JobsCalendar } from "@/components/provider/JobsCalendar";
import CreateJobModal from "@/components/provider/CreateJobModal";
import { toast } from "sonner";
import { syncJobToWorkflow } from "@/lib/workflow-sync";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Schedule() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobEvents, setSelectedJobEvents] = useState<any[]>([]);
  const [selectedJobReviews, setSelectedJobReviews] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [tab, setTab] = useState("week");

  useEffect(() => {
    loadJobs();
  }, [tab]);

  const loadJobs = async () => {
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
  };

  const handleAction = async (jobId: string, action: string) => {
    try {
      if (action === "start") {
        await handleStatusUpdate(jobId, "start");
      } else if (action === "complete") {
        await handleStatusUpdate(jobId, "complete");
      } else if (action === "auto_invoice") {
        await handleAutoInvoice(jobId);
      }
    } catch (error) {
      console.error("Error handling action:", error);
      toast.error("Failed to perform action");
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
            <Card key={i} className="p-4">
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
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage your jobs and appointments</p>
        </div>
        <Button onClick={() => setShowCreateJob(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-3 mt-6">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No jobs scheduled this week</p>
              <Button onClick={() => setShowCreateJob(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-6">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No jobs found</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="h-[600px]">
            <JobsCalendar 
              jobs={jobs}
              onSelectJob={openJobDetail}
            />
          </div>
        </TabsContent>
      </Tabs>

      {drawerOpen && selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          events={selectedJobEvents}
          reviews={selectedJobReviews}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {showCreateJob && (
        <CreateJobModal
          open={showCreateJob}
          onOpenChange={(isOpen) => {
            setShowCreateJob(isOpen);
            if (!isOpen) loadJobs();
          }}
          onSuccess={() => {
            setShowCreateJob(false);
            loadJobs();
          }}
        />
      )}
    </div>
  );
}
