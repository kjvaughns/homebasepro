import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Clock, Briefcase } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear } from "date-fns";

export default function MyEarnings() {
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [monthToDate, setMonthToDate] = useState<any>(null);
  const [yearToDate, setYearToDate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
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

      // Current pay period (this week)
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      
      const { data: currentEarnings } = await (supabase as any)
        .from("earnings")
        .select("*")
        .eq("team_member_id", member.id)
        .gte("period_start", format(weekStart, "yyyy-MM-dd"))
        .maybeSingle();

      setCurrentPeriod(currentEarnings);

      // Month to date
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const { data: monthEarnings } = await (supabase as any)
        .from("earnings")
        .select("*")
        .eq("team_member_id", member.id)
        .gte("period_start", format(monthStart, "yyyy-MM-dd"))
        .lte("period_end", format(monthEnd, "yyyy-MM-dd"));

      const mtdTotal = monthEarnings?.reduce((sum: number, e: any) => sum + e.total_cents, 0) || 0;
      setMonthToDate({
        total_cents: mtdTotal,
        hours: monthEarnings?.reduce((sum: number, e: any) => sum + Number(e.hours), 0) || 0,
        jobs_count: monthEarnings?.reduce((sum: number, e: any) => sum + e.jobs_count, 0) || 0,
      });

      // Year to date
      const yearStart = startOfYear(new Date());

      const { data: yearEarnings } = await (supabase as any)
        .from("earnings")
        .select("*")
        .eq("team_member_id", member.id)
        .gte("period_start", format(yearStart, "yyyy-MM-dd"));

      const ytdTotal = yearEarnings?.reduce((sum: number, e: any) => sum + e.total_cents, 0) || 0;
      setYearToDate({
        total_cents: ytdTotal,
        hours: yearEarnings?.reduce((sum: number, e: any) => sum + Number(e.hours), 0) || 0,
        jobs_count: yearEarnings?.reduce((sum: number, e: any) => sum + e.jobs_count, 0) || 0,
      });
    } catch (error) {
      console.error("Error loading earnings:", error);
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
        <h1 className="text-2xl sm:text-3xl font-bold">My Earnings</h1>
        <p className="text-sm text-muted-foreground">Track your compensation and hours</p>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Period</TabsTrigger>
          <TabsTrigger value="mtd">Month to Date</TabsTrigger>
          <TabsTrigger value="ytd">Year to Date</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Earnings
                </CardDescription>
                <CardTitle className="text-3xl">
                  ${((currentPeriod?.total_cents || 0) / 100).toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours Worked
                </CardDescription>
                <CardTitle className="text-3xl">
                  {Number(currentPeriod?.hours || 0).toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Jobs Completed
                </CardDescription>
                <CardTitle className="text-3xl">
                  {currentPeriod?.jobs_count || 0}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  OT Hours
                </CardDescription>
                <CardTitle className="text-3xl">
                  {Number(currentPeriod?.ot_hours || 0).toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {currentPeriod && (
            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Base Pay</span>
                    <span className="font-semibold">
                      ${((currentPeriod.total_cents - currentPeriod.commissions_cents - currentPeriod.tips_cents) / 100).toFixed(2)}
                    </span>
                  </div>
                  {currentPeriod.commissions_cents > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Commissions</span>
                      <span className="font-semibold">
                        ${(currentPeriod.commissions_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {currentPeriod.tips_cents > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Tips</span>
                      <span className="font-semibold">
                        ${(currentPeriod.tips_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {currentPeriod.reimbursements_cents > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Reimbursements</span>
                      <span className="font-semibold">
                        ${(currentPeriod.reimbursements_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 font-bold text-lg">
                    <span>Total</span>
                    <span>${(currentPeriod.total_cents / 100).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mtd" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Earnings</CardDescription>
                <CardTitle className="text-3xl">
                  ${((monthToDate?.total_cents || 0) / 100).toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Hours Worked</CardDescription>
                <CardTitle className="text-3xl">
                  {Number(monthToDate?.hours || 0).toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Jobs Completed</CardDescription>
                <CardTitle className="text-3xl">
                  {monthToDate?.jobs_count || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ytd" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Earnings</CardDescription>
                <CardTitle className="text-3xl">
                  ${((yearToDate?.total_cents || 0) / 100).toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Hours Worked</CardDescription>
                <CardTitle className="text-3xl">
                  {Number(yearToDate?.hours || 0).toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Jobs Completed</CardDescription>
                <CardTitle className="text-3xl">
                  {yearToDate?.jobs_count || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}