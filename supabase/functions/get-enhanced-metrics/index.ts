import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";
import { stripeGet } from "../_shared/stripe-fetch.ts";

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      console.error('UNAUTHORIZED: Missing Authorization header');
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('UNAUTHORIZED: Missing or invalid token', authError);
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      return errorResponse('ORG_NOT_FOUND', 'Organization not found', 404);
    }

    // Get payment KPIs using existing RPC
    const { data: kpis, error: kpisError } = await supabase
      .rpc('payments_kpis', { org_uuid: org.id });

    if (kpisError) {
      console.error('KPIs error:', kpisError);
      return errorResponse('KPI_ERROR', 'Failed to fetch payment KPIs', 500);
    }

    // Get Stripe balance if connected
    let stripeBalance = { available: 0, pending: 0 };
    let stripeError = null;
    if (org.stripe_account_id) {
      try {
        const balance = await stripeGet('balance', org.stripe_account_id);
        stripeBalance = {
          available: balance.available?.[0]?.amount || 0,
          pending: balance.pending?.[0]?.amount || 0,
        };
      } catch (error) {
        console.error('Stripe balance fetch error:', error);
        stripeError = error instanceof Error ? error.message : 'Failed to fetch Stripe balance';
        // Signal error state with -1
        stripeBalance = { available: -1, pending: -1 };
      }
    }

    // Calculate this week's earnings
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: weekPayments, error: weekError } = await supabase
      .from('payments')
      .select('amount')
      .eq('org_id', org.id)
      .in('status', ['paid', 'completed', 'succeeded'])
      .gte('created_at', startOfWeek.toISOString());

    const thisWeekEarnings = weekPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Get this week's job count
    const { data: weekJobs, error: jobsError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('provider_org_id', org.id)
      .gte('date_time_start', startOfWeek.toISOString())
      .lte('date_time_start', new Date().toISOString());

    const weekJobCount = weekJobs?.length || 0;
    const weekCompletedJobs = weekJobs?.filter(j => j.status === 'completed').length || 0;

    return successResponse({
      totalEarned: kpis.total || 0,
      pendingPayouts: stripeBalance.available,
      outstanding: kpis.ar || 0,
      thisWeekEarnings,
      thisWeekJobs: weekJobCount,
      thisWeekCompleted: weekCompletedJobs,
      stripePending: stripeBalance.pending,
      fees: kpis.fees || 0,
      net: kpis.net || 0,
      stripeError,
    });
  } catch (error) {
    console.error('Get enhanced metrics error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch metrics',
      500
    );
  }
});
