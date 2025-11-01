import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutGrid, List as ListIcon, Map as MapIcon, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { UnifiedJobCard } from "@/components/provider/UnifiedJobCard";
import { JobDetailDrawer } from "@/components/provider/JobDetailDrawer";
import { JobsMap } from "@/components/provider/JobsMap";
import { JobsCalendar } from "@/components/provider/JobsCalendar";
import CreateJobModal from "@/components/provider/CreateJobModal";
import { toast } from "sonner";
import { syncJobToWorkflow } from "@/lib/workflow-sync";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const Jobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [groupedJobs, setGroupedJobs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'kanban' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("all");
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobEvents, setSelectedJobEvents] = useState<any[]>([]);
  const [selectedJobReviews, setSelectedJobReviews] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportsServiceCalls, setSupportsServiceCalls] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);

  useEffect(() => {
    loadJobs();
    checkOrgFeatures();
    loadTeamMembers();
  }, [filterStatus, filterTimeframe, teamMemberFilter]);

  const checkOrgFeatures = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: org } = await supabase
      .from("organizations")
      .select("service_type")
      .eq("owner_id", user.id)
      .single();
    
    const diagnosticTrades = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair'];
    setSupportsServiceCalls(
      org?.service_type?.some((type: string) => diagnosticTrades.includes(type)) || false
    );
  };

  const loadTeamMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) return;

    const { data } = await supabase
      .from("team_members")
      .select("id, name")
      .eq("organization_id", org.id);

    setTeamMembers(data || []);
  };

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
          clients(name, email, phone, lifetime_value, total_jobs),
          service:services(name, default_price, estimated_duration_minutes),
          parts:job_parts(
            quantity,
            sell_price_per_unit,
            part:parts_materials(name, category)
          ),
          invoice:invoices(id, status, amount, due_date),
          workflow:workflow_states!workflow_states_service_request_id_fkey(
            workflow_stage,
            stage_started_at,
            stage_completed_at
          )
        `)
        .eq("provider_org_id", org.id)
        .order("window_start", { ascending: true, nullsFirst: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterTimeframe === "today") {
        const today = new Date().toISOString().split("T")[0];
        query = query.gte("window_start", `${today}T00:00:00Z`)
          .lt("window_start", `${today}T23:59:59Z`);
      } else if (filterTimeframe === "week") {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7*24*60*60*1000);
        query = query.gte("window_start", now.toISOString())
          .lt("window_start", weekEnd.toISOString());
      }

      if (teamMemberFilter && teamMemberFilter !== "all") {
        if (teamMemberFilter === "unassigned") {
          query = query.is("assigned_team_member_id", null);
        } else {
          query = query.eq("assigned_team_member_id", teamMemberFilter);
        }
      }

      const { data: jobsData } = await query;

      setJobs(jobsData || []);

      const grouped = (jobsData || []).reduce((acc: any, job: any) => {
        acc[job.status] = acc[job.status] || [];
        acc[job.status].push(job);
        return acc;
      }, {});
      setGroupedJobs(grouped);

    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load jobs");
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
        toast.success(
          `Invoice ${data.invoice.invoice_number} created!`,
          {
            action: {
              label: "View",
              onClick: () => window.location.href = `/provider/accounting?invoice=${data.invoice.id}`
            }
          }
        );
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
    
    // Sync job status to workflow_states
    try {
      // Map action to job status
      const actionToStatusMap: Record<string, string> = {
        'start': 'in_progress',
        'complete': 'completed',
        'started': 'in_progress',
        'completed': 'completed',
        'schedule': 'scheduled',
        'en_route': 'en_route'
      };
      
      const jobStatus = actionToStatusMap[action] || action;
      await syncJobToWorkflow(jobId, jobStatus);
    } catch (workflowError) {
      console.error("Failed to sync workflow:", workflowError);
      // Don't block the UI if workflow sync fails
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

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      const scheduledJobs = jobs.filter(j => 
        ['scheduled', 'in_progress'].includes(j.status) && j.lat && j.lng
      );

      if (scheduledJobs.length < 2) {
        toast.error("Need at least 2 jobs with locations to optimize route");
        return;
      }

      const { data, error } = await supabase.functions.invoke("assistant-provider", {
        body: {
          message: `Optimize route for ${scheduledJobs.length} jobs`,
          context: {
            action: "optimize_route",
            job_ids: scheduledJobs.map(j => j.id)
          }
        }
      });

      if (error) throw error;

      setOptimizedRoute(data.route);
      toast.success("Route optimized!");
      loadJobs();
    } catch (error) {
      console.error("Error optimizing route:", error);
      toast.error("Failed to optimize route");
    } finally {
      setOptimizing(false);
    }
  };

  const columns = [
    { key: 'lead', label: 'Leads', hidden: false },
    { key: 'service_call', label: 'Service Calls', hidden: !supportsServiceCalls },
    { key: 'quoted', label: 'Quoted', hidden: false },
    { key: 'scheduled', label: 'Scheduled', hidden: false },
    { key: 'in_progress', label: 'In Progress', hidden: false },
    { key: 'completed', label: 'Completed', hidden: false },
    { key: 'invoiced', label: 'Invoiced', hidden: false },
    { key: 'paid', label: 'Paid', hidden: false }
  ].filter(c => !c.hidden);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
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
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage your complete job pipeline</p>
        </div>
        <Button onClick={() => setShowCreateJob(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <Button
            variant={filterTimeframe === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTimeframe("today")}
          >
            Today
          </Button>
          <Button
            variant={filterTimeframe === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTimeframe("week")}
          >
            This Week
          </Button>
          <Button
            variant={filterTimeframe === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTimeframe("all")}
          >
            All
          </Button>
        </div>

        <Select value={teamMemberFilter} onValueChange={setTeamMemberFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Team Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map(tm => (
              <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {columns.map(col => (
              <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimizeRoute}
            disabled={optimizing}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {optimizing ? "Optimizing..." : "Optimize Route"}
          </Button>
          
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <UnifiedJobCard job={job} onAction={handleAction} />
              </div>
            ))
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No jobs found</p>
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[calc(100vh-16rem)] md:h-[600px]">
          <JobsMap 
            jobs={jobs}
            selectedJob={selectedJob}
            onJobSelect={openJobDetail}
            optimizedRoute={optimizedRoute}
          />
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 xl:grid-cols-5 mobile-scroll-x">
          {columns.map(col => (
            <div key={col.key} className="bg-muted/30 rounded-xl p-3 min-w-[280px] snap-start md:min-w-0">
              <div className="font-semibold mb-3 flex items-center justify-between">
                <span>{col.label}</span>
                <Badge variant="secondary">{groupedJobs[col.key]?.length || 0}</Badge>
              </div>
              <div className="space-y-2">
                {(groupedJobs[col.key] || []).map((job: any) => (
                  <div key={job.id} onClick={() => openJobDetail(job)}>
                    <UnifiedJobCard job={job} onAction={handleAction} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <JobsCalendar 
          jobs={jobs}
          onSelectJob={openJobDetail}
        />
      )}

      <JobDetailDrawer
        job={selectedJob}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        events={selectedJobEvents}
        reviews={selectedJobReviews}
      />

      <CreateJobModal
        open={showCreateJob}
        onOpenChange={setShowCreateJob}
        onSuccess={() => {
          setShowCreateJob(false);
          loadJobs();
          toast.success("Job created! What's next? Send an invoice to get paid.");
        }}
      />
    </div>
  );
};

export default Jobs;
