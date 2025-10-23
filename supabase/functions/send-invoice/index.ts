import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    const { invoiceId, clientEmail, pdfUrl, invoiceNumber, amount, dueDate, providerName, clientName } = await req.json();

    // Create notification for the client
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', clientEmail)
      .maybeSingle();

    if (clientProfile?.user_id) {
      await supabase.from('notifications').insert({
        user_id: clientProfile.user_id,
        title: `New Invoice from ${providerName}`,
        message: `Invoice ${invoiceNumber} for $${(amount / 100).toFixed(2)} is due on ${new Date(dueDate).toLocaleDateString()}`,
        type: 'invoice',
        data: {
          invoice_id: invoiceId,
          pdf_url: pdfUrl,
          amount: amount,
          due_date: dueDate,
        }
      });
    }

    // Update invoice status
    await supabase
      .from('invoices')
      .update({ 
        email_sent_at: new Date().toISOString(),
        email_status: 'sent'
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({ success: true, message: 'Invoice notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Send invoice error:', error);
    
    // Try to update invoice status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { invoiceId } = await req.json();
      if (invoiceId) {
        await supabase
          .from('invoices')
          .update({ email_status: 'failed' })
          .eq('id', invoiceId);
      }
    } catch (updateError) {
      console.error('Failed to update invoice status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
