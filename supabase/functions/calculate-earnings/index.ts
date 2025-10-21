import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { teamMemberId, periodStart, periodEnd, organizationId } = await req.json();

    if (!teamMemberId || !periodStart || !periodEnd || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team member compensation details
    const { data: compensation } = await supabaseClient
      .from("team_member_compensation")
      .select("*, team_members!inner(overtime_policy_id)")
      .eq("team_member_id", teamMemberId)
      .single();

    if (!compensation) {
      return new Response(
        JSON.stringify({ error: "Compensation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get approved time entries for the period
    const { data: timeEntries } = await supabaseClient
      .from("time_entries")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .eq("status", "approved")
      .gte("clock_in_at", periodStart)
      .lte("clock_in_at", periodEnd);

    // Calculate total hours and overtime hours
    let totalHours = 0;
    let overtimeHours = 0;
    let doubleTimeHours = 0;

    // Get overtime policy if exists
    let otPolicy = null;
    if (compensation.team_members?.overtime_policy_id) {
      const { data: policy } = await supabaseClient
        .from("overtime_policies")
        .select("*")
        .eq("id", compensation.team_members.overtime_policy_id)
        .single();
      otPolicy = policy;
    }

    // Group time entries by day and week for OT calculation
    const entriesByDay: { [key: string]: number } = {};
    let weeklyHours = 0;

    timeEntries?.forEach((entry) => {
      if (!entry.clock_out_at) return;

      const clockIn = new Date(entry.clock_in_at);
      const clockOut = new Date(entry.clock_out_at);
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      const breakHours = (entry.break_minutes || 0) / 60;
      const netHours = hoursWorked - breakHours;

      const dayKey = clockIn.toISOString().split("T")[0];
      entriesByDay[dayKey] = (entriesByDay[dayKey] || 0) + netHours;
      weeklyHours += netHours;
      totalHours += netHours;
    });

    // Calculate OT based on policy
    if (otPolicy) {
      // Daily OT
      Object.values(entriesByDay).forEach((dayHours) => {
        if (dayHours > otPolicy.daily_ot_hours) {
          const dailyOT = Math.min(
            dayHours - otPolicy.daily_ot_hours,
            otPolicy.double_time_hours - otPolicy.daily_ot_hours
          );
          overtimeHours += dailyOT;

          if (dayHours > otPolicy.double_time_hours) {
            doubleTimeHours += dayHours - otPolicy.double_time_hours;
          }
        }
      });

      // Weekly OT
      if (weeklyHours > otPolicy.weekly_ot_hours) {
        overtimeHours += Math.max(0, weeklyHours - otPolicy.weekly_ot_hours - overtimeHours);
      }
    }

    // Calculate base pay
    const regularHours = totalHours - overtimeHours - doubleTimeHours;
    let totalCents = 0;

    if (compensation.pay_type === "hourly") {
      const baseRate = compensation.pay_rate || 0;
      const otRate = compensation.overtime_rate || baseRate * (otPolicy?.ot_multiplier || 1.5);
      const dtRate = baseRate * (otPolicy?.double_time_multiplier || 2.0);

      totalCents += Math.round(regularHours * baseRate * 100);
      totalCents += Math.round(overtimeHours * otRate * 100);
      totalCents += Math.round(doubleTimeHours * dtRate * 100);
    } else if (compensation.pay_type === "salary") {
      // For salary, divide annual by pay periods (26 for bi-weekly)
      totalCents = Math.round((compensation.pay_rate / 26) * 100);
    }

    // Get completed jobs for commission calculation
    const { data: jobs } = await supabaseClient
      .from("jobs")
      .select("total_amount")
      .contains("assigned_members", [teamMemberId])
      .eq("status", "completed")
      .gte("completed_at", periodStart)
      .lte("completed_at", periodEnd);

    let commissionsCents = 0;
    if (compensation.commission_pct && jobs) {
      const totalJobRevenue = jobs.reduce((sum, job) => sum + (job.total_amount || 0), 0);
      commissionsCents = Math.round(totalJobRevenue * (compensation.commission_pct / 100) * 100);
    }

    // Get tips
    const { data: tips } = await supabaseClient
      .from("job_tips")
      .select("amount")
      .eq("team_member_id", teamMemberId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    const tipsCents = tips?.reduce((sum, tip) => sum + Math.round(tip.amount * 100), 0) || 0;

    // Calculate total
    const totalEarningsCents = totalCents + commissionsCents + tipsCents;

    // Create or update earnings record
    const earningsData = {
      team_member_id: teamMemberId,
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      hours: totalHours,
      ot_hours: overtimeHours + doubleTimeHours,
      jobs_count: jobs?.length || 0,
      commissions_cents: commissionsCents,
      tips_cents: tipsCents,
      reimbursements_cents: 0,
      adjustments_cents: 0,
      total_cents: totalEarningsCents,
      approved: false,
    };

    const { data: earnings, error } = await supabaseClient
      .from("earnings")
      .upsert(earningsData, {
        onConflict: "team_member_id,period_start,period_end",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        earnings,
        breakdown: {
          regularHours,
          overtimeHours,
          doubleTimeHours,
          totalHours,
          basePay: totalCents / 100,
          commissions: commissionsCents / 100,
          tips: tipsCents / 100,
          total: totalEarningsCents / 100,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating earnings:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});