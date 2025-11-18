import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Cleaning up expired invoices...');

    const now = new Date().toISOString();

    // Find expired invoices
    const { data: expiredInvoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, org_id, client_email')
      .eq('status', 'open')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired invoices:', fetchError);
      throw fetchError;
    }

    if (!expiredInvoices || expiredInvoices.length === 0) {
      console.log('✅ No expired invoices found');
      return new Response(
        JSON.stringify({ message: 'No expired invoices', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredInvoices.length} expired invoices`);

    // Mark as expired
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'expired' })
      .in('id', expiredInvoices.map(inv => inv.id));

    if (updateError) {
      console.error('Error updating invoices:', updateError);
      throw updateError;
    }

    // Send notification to providers about expired invoices via centralized system
    for (const invoice of expiredInvoices) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', invoice.org_id)
        .single();

      if (org?.owner_id) {
        try {
          await supabase.functions.invoke('dispatch-notification', {
            headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: {
              type: 'payment',
              userId: org.owner_id,
              role: 'provider',
              title: 'Invoice Expired',
              body: `Invoice ${invoice.invoice_number} has expired. You can resend it from your invoices page.`,
              actionUrl: '/provider/payments',
              metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number }
            }
          });
          console.log(`✅ Expiry notification dispatched for invoice ${invoice.invoice_number}`);
        } catch (error) {
          console.error(`Failed to dispatch notification for invoice ${invoice.id}:`, error);
        }
      }
    }

    console.log(`✅ Marked ${expiredInvoices.length} invoices as expired`);

    return new Response(
      JSON.stringify({
        success: true,
        expiredCount: expiredInvoices.length,
        invoices: expiredInvoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});