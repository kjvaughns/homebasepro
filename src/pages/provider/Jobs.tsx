import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, Map } from "lucide-react";
import { UnifiedJobCard } from "@/components/provider/UnifiedJobCard";
import { JobDetailDrawer } from "@/components/provider/JobDetailDrawer";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Jobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [groupedJobs, setGroupedJobs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'map'>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobEvents, setSelectedJobEvents] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportsServiceCalls, setSupportsServiceCalls] = useState(false);

  useEffect(() => {
    loadJobs();
    checkOrgFeatures();
  }, [filterStatus, filterTimeframe]);

  const checkOrgFeatures = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: org } = await supabase
      .from("organizations")
      .select("service_type")
      .eq("owner_id", user.id)
      .single();
    
    // Service calls for HVAC, Plumbing, Electrical, Appliance Repair
    const diagnosticTrades = ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair'];
    setSupportsServiceCalls(
      org?.service_type?.some((type: string) => diagnosticTrades.includes(type)) || false
    );
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
        .select("*, clients(name, email, phone)")
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

      const { data: jobsData } = await query;

      setJobs(jobsData || []);

      // Group by status for Kanban
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
      } else if (action === "invoice") {
        await handleStatusUpdate(jobId, "invoice", { amount: 150 });
      } else if (action === "mark_paid") {
        await handleStatusUpdate(jobId, "mark_paid", { amount: 150 });
      } else {
        toast.info(`${action} dialog coming soon`);
      }
    } catch (error) {
      console.error("Error handling action:", error);
      toast.error("Failed to perform action");
    }
  };

  const handleStatusUpdate = async (jobId: string, action: string, payload?: any) => {
    const { error } = await supabase.functions.invoke("assistant-provider", {
      body: {
        message: `update_job_status`,
        tools: [{
          name: "update_job_status",
          arguments: { job_id: jobId, action, payload }
        }]
      }
    });

    if (error) throw error;
    
    toast.success("Job updated");
    loadJobs();
  };

  const openJobDetail = async (job: any) => {
    setSelectedJob(job);
    
    // Load events
    const { data: events } = await supabase
      .from("job_events" as any)
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false });
    
    setSelectedJobEvents(events || []);
    setDrawerOpen(true);
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
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage your complete job pipeline</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
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
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto">
          {columns.map(col => (
            <div key={col.key} className="bg-muted/30 rounded-xl p-3 min-w-[280px]">
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
                {(!groupedJobs[col.key] || groupedJobs[col.key].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No {col.label.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No jobs found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.id} onClick={() => openJobDetail(job)}>
                  <UnifiedJobCard job={job} onAction={handleAction} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Calendar/Map placeholders */}
      {(viewMode === 'calendar' || viewMode === 'map') && (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground capitalize">{viewMode} view coming soon</p>
        </div>
      )}

      {/* Job Detail Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        events={selectedJobEvents}
      />
    </div>
  );
};

export default Jobs;
