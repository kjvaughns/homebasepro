import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { stripeGet } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('get-admin-analytics function starting');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { timeRange = '30d' } = await req.json();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (timeRange === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setFullYear(startDate.getFullYear() - 1);

    // Get platform fees collected from ledger
    const { data: platformFees } = await supabase
      .from('ledger_entries')
      .select('amount_cents, occurred_at')
      .eq('type', 'fee')
      .eq('party', 'platform')
      .gte('occurred_at', startDate.toISOString());

    const totalPlatformFees = platformFees?.reduce((sum, entry) => sum + entry.amount_cents, 0) || 0;

    // Provider subscription MRR
    const { data: subscriptions } = await supabase
      .from('provider_subscriptions')
      .select('plan, status')
      .eq('status', 'active');

    const betaCount = subscriptions?.filter(s => s.plan === 'beta').length || 0;
    const growthCount = subscriptions?.filter(s => s.plan === 'growth').length || 0;
    const proCount = subscriptions?.filter(s => s.plan === 'pro').length || 0;
    const scaleCount = subscriptions?.filter(s => s.plan === 'scale').length || 0;

    const subscriptionMRR = (betaCount * 1500) + (growthCount * 2900) + (proCount * 9900) + (scaleCount * 29900);

    // Transaction fee MRR (average monthly from time period)
    const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const transactionFeeMRR = Math.round((totalPlatformFees / daysInPeriod) * 30);

    const totalMRR = subscriptionMRR + transactionFeeMRR;
    const totalARR = totalMRR * 12;

    // Active providers
    const { data: activeOrgs } = await supabase
      .from('organizations')
      .select('id')
      .not('stripe_account_id', 'is', null)
      .eq('payments_ready', true);

    // Top providers by transaction volume
    const { data: topProvidersData } = await supabase
      .from('payments')
      .select(`
        org_id,
        amount,
        organizations!inner(name, plan)
      `)
      .eq('status', 'paid')
      .gte('payment_date', startDate.toISOString());

    const providerRevenue = new Map();
    topProvidersData?.forEach(payment => {
      const orgId = payment.org_id;
      if (!providerRevenue.has(orgId)) {
        providerRevenue.set(orgId, {
          name: payment.organizations?.name || 'Unknown',
          revenue: 0,
          tier: payment.organizations?.plan || 'free'
        });
      }
      const entry = providerRevenue.get(orgId);
      entry.revenue += payment.amount;
    });

    const topProviders = Array.from(providerRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Platform fees by month
    const feesByMonth: { [key: string]: number } = {};
    platformFees?.forEach(fee => {
      const month = new Date(fee.occurred_at).toLocaleDateString('en-US', { month: 'short' });
      feesByMonth[month] = (feesByMonth[month] || 0) + fee.amount_cents;
    });

    const platformFeesTrend = Object.entries(feesByMonth).map(([month, amount]) => ({
      month,
      fees: amount / 100
    }));

    // Calculate growth from previous period
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysInPeriod);

    const { data: prevPlatformFees } = await supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('type', 'fee')
      .eq('party', 'platform')
      .gte('occurred_at', prevStartDate.toISOString())
      .lt('occurred_at', startDate.toISOString());

    const prevTotalFees = prevPlatformFees?.reduce((sum, entry) => sum + entry.amount_cents, 0) || 1;
    const revenueGrowth = ((totalPlatformFees - prevTotalFees) / prevTotalFees) * 100;

    // Get Stripe platform balance
    let availableBalance = 0;
    let pendingBalance = 0;
    try {
      const balance = await stripeGet('balance');
      availableBalance = balance.available?.[0]?.amount || 0;
      pendingBalance = balance.pending?.[0]?.amount || 0;
    } catch (error) {
      console.error('Error fetching Stripe balance:', error);
    }

    return new Response(
      JSON.stringify({
        platformMRR: totalMRR,
        subscriptionMRR,
        transactionFeeMRR,
        totalARR,
        applicationFeesCollected: totalPlatformFees,
        activeProviders: activeOrgs?.length || 0,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        providerCounts: {
          beta: betaCount,
          growth: growthCount,
          pro: proCount,
          scale: scaleCount
        },
        topProviders,
        platformFeesTrend,
        stripeBalance: {
          available: availableBalance,
          pending: pendingBalance
        },
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-admin-analytics:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
