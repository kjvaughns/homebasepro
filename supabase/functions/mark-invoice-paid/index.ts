import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    console.log('📝 Marking invoice as paid:', invoiceId);

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*, organization_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Invoice not found');

    // Update invoice status
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        received: true
      })
      .eq('id', invoiceId);

    if (updateError) throw updateError;

    // Get current organization data
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('lifetime_revenue')
      .eq('id', invoice.organization_id)
      .single();

    if (orgError) {
      console.error('Error fetching org:', orgError);
    }

    // Update organization lifetime revenue
    if (org && invoice.net_to_provider_cents) {
      const newRevenue = (org.lifetime_revenue || 0) + invoice.net_to_provider_cents;
      const { error: revenueError } = await supabaseClient
        .from('organizations')
        .update({ lifetime_revenue: newRevenue })
        .eq('id', invoice.organization_id);

      if (revenueError) {
        console.error('Error updating revenue:', revenueError);
      }
    }

    // Compute updated money summary
    const { data: invoices } = await supabaseClient
      .from('invoices')
      .select('amount, net_to_provider_cents, received, status')
      .eq('organization_id', invoice.organization_id);

    const summary = {
      lifetime_earned: invoices
        ?.filter(i => i.received)
        ?.reduce((sum, i) => sum + (i.net_to_provider_cents || 0), 0) || 0,
      outstanding: invoices
        ?.filter(i => !i.received && i.status !== 'paid')
        ?.reduce((sum, i) => sum + (i.net_to_provider_cents || i.amount || 0), 0) || 0,
      total_gross: invoices
        ?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
    };

    console.log('✅ Invoice marked as paid successfully');

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error marking invoice as paid:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});