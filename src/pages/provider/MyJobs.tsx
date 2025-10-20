import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UnifiedJobCard } from "@/components/provider/UnifiedJobCard";
import { JobDetailDrawer } from "@/components/provider/JobDetailDrawer";
import { JobsMap } from "@/components/provider/JobsMap";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Map as MapIcon, List, Navigation } from "lucide-react";

const MyJobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobEvents, setSelectedJobEvents] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("today");

  useEffect(() => {
    loadMyJobs();
  }, [filterDate]);

  const loadMyJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teamMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!teamMember) return;

      let query = supabase
        .from("jobs" as any)
        .select("*, clients(name, email, phone)")
        .eq("assigned_team_member_id", teamMember.id)
        .order("route_order", { ascending: true, nullsFirst: false })
        .order("window_start", { ascending: true });

      if (filterDate === "today") {
        const today = new Date().toISOString().split("T")[0];
        query = query.gte("window_start", `${today}T00:00:00Z`)
          .lt("window_start", `${today}T23:59:59Z`);
      } else if (filterDate === "week") {
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7*24*60*60*1000);
        query = query.gte("window_start", now.toISOString())
          .lt("window_start", weekEnd.toISOString());
      }

      const { data: jobsData } = await query;
      setJobs(jobsData || []);
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
      }
    } catch (error) {
      console.error("Error handling action:", error);
      toast.error("Failed to perform action");
    }
  };

  const handleStatusUpdate = async (jobId: string, action: string) => {
    const { error } = await supabase
      .from("jobs" as any)
      .update({
        status: action === "start" ? "in_progress" : "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", jobId);

    if (error) throw error;
    
    await supabase.from("job_events" as any).insert({
      job_id: jobId,
      event_type: action === "start" ? "started" : "completed",
      payload: {}
    });
    
    toast.success(action === "start" ? "Job started" : "Job completed");
    loadMyJobs();
  };

  const openJobDetail = async (job: any) => {
    setSelectedJob(job);
    
    const { data: events } = await supabase
      .from("job_events" as any)
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false });
    
    setSelectedJobEvents(events || []);
    setDrawerOpen(true);
  };

  const handleNavigate = () => {
    if (jobs.length === 0) return;
    
    const waypoints = jobs
      .filter(j => j.lat && j.lng)
      .map(j => `${j.lat},${j.lng}`)
      .join('/');
    
    const firstJob = jobs[0];
    const url = `https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${firstJob.lat},${firstJob.lng}&waypoints=${waypoints}&travelmode=driving`;
    
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">Your assigned jobs for {filterDate === "today" ? "today" : "this week"}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Button
          variant={filterDate === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterDate("today")}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Today
        </Button>
        <Button
          variant={filterDate === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterDate("week")}
        >
          This Week
        </Button>
        
        {jobs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={handleNavigate}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Start Navigation
          </Button>
        )}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {jobs.length > 0 ? (
            jobs.map((job, index) => (
              <div key={job.id} onClick={() => openJobDetail(job)}>
                <div className="flex items-center gap-3">
                  {job.route_order && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {job.route_order}
                    </div>
                  )}
                  <div className="flex-1">
                    <UnifiedJobCard job={job} onAction={handleAction} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No jobs assigned for {filterDate === "today" ? "today" : "this week"}</p>
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
          />
        </div>
      )}

      <JobDetailDrawer
        job={selectedJob}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        events={selectedJobEvents}
      />
    </div>
  );
};

export default MyJobs;
