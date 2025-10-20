import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, List } from "lucide-react";
import { JobCard } from "@/components/provider/JobCard";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

const Jobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');

  useEffect(() => {
    loadJobs();
  }, []);

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

      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, clients(name, email)")
        .eq("provider_org_id", org.id)
        .gte("date_time_start", new Date().toISOString())
        .order("date_time_start");

      setJobs(bookingsData || []);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Job marked as completed");
      loadJobs();
    } catch (error) {
      console.error("Error completing job:", error);
      toast.error("Failed to complete job");
    }
  };

  const renderCalendarView = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day) => {
          const dayJobs = jobs.filter(job => 
            isSameDay(new Date(job.date_time_start), day)
          );

          return (
            <div key={day.toISOString()} className="border rounded-lg p-4">
              <div className="text-center mb-3">
                <div className="text-sm text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className="text-2xl font-bold">
                  {format(day, 'd')}
                </div>
              </div>
              <div className="space-y-2">
                {dayJobs.map((job) => (
                  <div key={job.id} className="bg-muted p-2 rounded text-sm">
                    <div className="font-medium">{job.service_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(job.date_time_start), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs & Schedule</h1>
          <p className="text-muted-foreground">Manage your appointments and routes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Map
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : viewMode === 'map' ? (
        <div className="border rounded-lg p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Map view coming soon</p>
        </div>
      ) : (
        <>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No upcoming jobs</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Jobs;
