import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { payment_ids } = await req.json();

    if (!Array.isArray(payment_ids) || payment_ids.length === 0) {
      throw new Error('payment_ids array is required');
    }

    // Fetch payments with client details
    const { data: payments, error: paymentsError } = await supabaseClient
      .from('payments')
      .select('*, clients(name, email)')
      .in('id', payment_ids)
      .in('status', ['open', 'pending']);

    if (paymentsError) throw paymentsError;

    let successCount = 0;

    for (const payment of payments || []) {
      if (!payment.clients?.email) {
        console.log(`Skipping payment ${payment.id} - no client email`);
        continue;
      }

      try {
        // Generate AI reminder email using Lovable AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that generates professional payment reminder emails. Keep them friendly, concise, and include payment details. Format the response as plain text suitable for an email body.'
              },
              {
                role: 'user',
                content: `Generate a payment reminder email for ${payment.clients.name}. Amount due: $${(payment.amount / 100).toFixed(2)}. Status: ${payment.status}. Keep it under 150 words and maintain a professional yet friendly tone.`
              }
            ]
          })
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const emailBody = aiData.choices[0].message.content;

        // Log communication (in production, this would send actual emails via Resend/SendGrid)
        const { error: logError } = await supabaseClient.from('comm_logs').insert({
          type: 'payment_reminder',
          recipient_email: payment.clients.email,
          subject: `Payment Reminder - Invoice ${payment.id.slice(0, 8)}`,
          body: emailBody,
          payment_id: payment.id,
          sent_by: user.id
        });

        if (logError) {
          console.error('Error logging communication:', logError);
        } else {
          successCount++;
          console.log(`Reminder logged for payment ${payment.id}`);
        }
      } catch (error) {
        console.error(`Error processing payment ${payment.id}:`, error);
        // Continue with other payments even if one fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: successCount,
        message: `Sent ${successCount} payment reminder${successCount !== 1 ? 's' : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending reminders:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
