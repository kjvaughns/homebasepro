import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { stripeGet } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('get-provider-analytics function starting');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { timeRange = '30d' } = await req.json();

    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (timeRange === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate.setFullYear(startDate.getFullYear() - 1);

    // Fetch payments from database (synced from Stripe)
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('org_id', org.id)
      .eq('status', 'paid')
      .gte('payment_date', startDate.toISOString())
      .order('payment_date', { ascending: true });

    // Calculate metrics
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.net_amount || p.amount - (p.fee_amount || 0)), 0) || 0;
    const totalGross = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalFees = payments?.reduce((sum, p) => sum + (p.fee_amount || 0), 0) || 0;
    const platformFeesCharged = payments?.reduce((sum, p) => sum + (p.application_fee_cents || 0), 0) || 0;
    const transactionCount = payments?.length || 0;
    const avgTransactionValue = transactionCount > 0 ? totalGross / transactionCount : 0;

    // Revenue by month
    const revenueByMonth: { [key: string]: number } = {};
    payments?.forEach(payment => {
      const month = new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short' });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (payment.net_amount || payment.amount - (payment.fee_amount || 0));
    });

    const revenueData = Object.entries(revenueByMonth).map(([month, revenue]) => ({
      month,
      revenue: revenue / 100 // Convert cents to dollars
    }));

    // Active clients (from payments)
    const uniqueClients = new Set(
      payments?.map(p => p.homeowner_profile_id).filter(Boolean) || []
    );

    // Service type distribution from invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, metadata')
      .eq('organization_id', org.id)
      .eq('status', 'paid')
      .gte('created_at', startDate.toISOString());

    const serviceTypeRevenue: { [key: string]: number } = {};
    invoices?.forEach(invoice => {
      const serviceType = invoice.metadata?.service_type || 'General Service';
      serviceTypeRevenue[serviceType] = (serviceTypeRevenue[serviceType] || 0) + invoice.amount;
    });

    const totalServiceRevenue = Object.values(serviceTypeRevenue).reduce((sum, val) => sum + val, 0) || 1;
    const serviceTypeData = Object.entries(serviceTypeRevenue).map(([name, value], index) => ({
      name,
      value: Math.round((value / totalServiceRevenue) * 100),
      color: index === 0 ? "hsl(var(--primary))" : index === 1 ? "hsl(var(--accent))" : "hsl(var(--muted))"
    }));

    // Calculate previous period for comparison
    const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysInPeriod);

    const { data: prevPayments } = await supabase
      .from('payments')
      .select('amount, fee_amount, net_amount')
      .eq('org_id', org.id)
      .eq('status', 'paid')
      .gte('payment_date', prevStartDate.toISOString())
      .lt('payment_date', startDate.toISOString());

    const prevRevenue = prevPayments?.reduce((sum, p) => sum + (p.net_amount || p.amount - (p.fee_amount || 0)), 0) || 1;
    const revenueChange = ((totalRevenue - prevRevenue) / prevRevenue) * 100;

    return new Response(
      JSON.stringify({
        totalRevenue,
        totalGross,
        totalFees,
        platformFeesCharged,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        activeClients: uniqueClients.size,
        avgTransactionValue,
        transactionCount,
        revenueByMonth: revenueData,
        serviceTypeData,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-provider-analytics:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
