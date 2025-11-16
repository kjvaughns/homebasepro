import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClockInButton } from "@/components/provider/ClockInButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, DollarSign, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function TechnicianHome() {
  const [teamMemberId, setTeamMemberId] = useState<string>("");
  const [nextJob, setNextJob] = useState<any>(null);
  const [todayJobs, setTodayJobs] = useState<any[]>([]);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTechnicianData();
  }, []);

  const loadTechnicianData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get team member ID
      const { data: member } = await (supabase as any)
        .from("team_members")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (!member) return;
      setTeamMemberId(member.id);

      // Get today's jobs
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: jobs } = await (supabase as any)
        .from("jobs")
        .select("*")
        .contains("assigned_members", [member.id])
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true });

      if (jobs && jobs.length > 0) {
        setNextJob(jobs[0]);
        setTodayJobs(jobs.filter((j: any) => j.scheduled_date === today));
      }

      // Get week earnings
      const { data: earnings } = await (supabase as any)
        .from("earnings")
        .select("total_cents")
        .eq("team_member_id", member.id)
        .gte("period_start", format(new Date(new Date().setDate(new Date().getDate() - 7)), "yyyy-MM-dd"))
        .maybeSingle();

      if (earnings) {
        setWeekEarnings(earnings.total_cents / 100);
      }
    } catch (error) {
      console.error("Error loading technician data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Welcome Back!</h1>
        <p className="text-sm text-muted-foreground">Here's your day at a glance</p>
      </div>

      {/* Clock In/Out */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClockInButton
            teamMemberId={teamMemberId}
            onClockIn={loadTechnicianData}
            onClockOut={loadTechnicianData}
          />
        </CardContent>
      </Card>

      {/* Next Job */}
      {nextJob ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Next Job
            </CardTitle>
            <CardDescription>
              {format(new Date(nextJob.scheduled_date), "MMM d, yyyy")} at{" "}
              {nextJob.scheduled_time || "TBD"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">{nextJob.service_type}</h3>
              <p className="text-sm text-muted-foreground">{nextJob.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/provider/jobs/${nextJob.id}`)}
              >
                View Details
              </Button>
              <Button
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    nextJob.address
                  )}`;
                  window.open(url, "_blank");
                }}
              >
                Navigate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming jobs</h3>
            <p className="text-muted-foreground">Your schedule is clear</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Today's Jobs</CardDescription>
            <CardTitle className="text-3xl">{todayJobs.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/provider/my-jobs")}
            >
              View All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Week Earnings</CardDescription>
            <CardTitle className="text-3xl">${weekEarnings.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/provider/time-tracking")}
            >
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Messages</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/provider/messages")}
            >
              Open Messages
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate("/provider/time-tracking")}
          >
            <Clock className="mr-2 h-4 w-4" />
            View Time Tracking
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate("/provider/my-jobs")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            View Schedule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}