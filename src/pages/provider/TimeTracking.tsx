import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClockInButton } from "@/components/provider/ClockInButton";
import { TimeEntryCard } from "@/components/provider/TimeEntryCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, format } from "date-fns";

export default function TimeTracking() {
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [teamMemberId, setTeamMemberId] = useState<string>("");

  useEffect(() => {
    loadTimeData();
  }, []);

  const loadTimeData = async () => {
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

      // Get this week's entries
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());

      const { data: entries } = await (supabase as any)
        .from("time_entries")
        .select("*")
        .eq("team_member_id", member.id)
        .gte("clock_in_at", weekStart.toISOString())
        .lte("clock_in_at", weekEnd.toISOString())
        .order("clock_in_at", { ascending: false });

      setTimeEntries(entries || []);

      // Calculate hours
      let weekTotal = 0;
      let todayTotal = 0;
      const today = format(new Date(), "yyyy-MM-dd");

      entries?.forEach((entry: any) => {
        if (entry.clock_out_at) {
          const start = new Date(entry.clock_in_at);
          const end = new Date(entry.clock_out_at);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const breakHours = (entry.break_minutes || 0) / 60;
          const netHours = hours - breakHours;

          weekTotal += netHours;

          if (format(start, "yyyy-MM-dd") === today) {
            todayTotal += netHours;
          }
        }
      });

      setWeeklyHours(weekTotal);
      setTodayHours(todayTotal);
    } catch (error) {
      console.error("Error loading time data:", error);
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
        <h1 className="text-2xl sm:text-3xl font-bold">Time Tracking</h1>
        <p className="text-sm text-muted-foreground">Track your work hours</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Today</CardDescription>
            <CardTitle className="text-3xl">{todayHours.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Hours worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>This Week</CardDescription>
            <CardTitle className="text-3xl">{weeklyHours.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Hours worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <ClockInButton
              teamMemberId={teamMemberId}
              onClockIn={loadTimeData}
              onClockOut={loadTimeData}
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">
            <Calendar className="h-4 w-4 mr-2" />
            This Week
          </TabsTrigger>
          <TabsTrigger value="all">
            <Clock className="h-4 w-4 mr-2" />
            All Entries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-4 mt-4">
          {timeEntries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No time entries this week</h3>
                <p className="text-muted-foreground">
                  Clock in to start tracking your time
                </p>
              </CardContent>
            </Card>
          ) : (
            timeEntries.map((entry) => (
              <TimeEntryCard key={entry.id} entry={entry} showActions={false} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Showing entries from this week only
          </p>
          {timeEntries.map((entry) => (
            <TimeEntryCard key={entry.id} entry={entry} showActions={false} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}