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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!org) throw new Error('Organization not found');

    const { action } = await req.json();

    // Suggest actions based on payment data
    if (action === 'suggest_actions') {
      // Get overdue payments
      const { data: overduePayments } = await supabase
        .from('payments')
        .select('*, clients(name)')
        .eq('org_id', org.id)
        .in('status', ['open', 'pending'])
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      // Get upcoming jobs without deposits
      const { data: upcomingJobs } = await supabase
        .from('bookings')
        .select('*, clients(name)')
        .eq('provider_org_id', org.id)
        .eq('status', 'pending')
        .gte('date_time_start', new Date().toISOString())
        .lte('date_time_start', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      const suggestions = [];

      if (overduePayments && overduePayments.length > 0) {
        suggestions.push({
          type: 'overdue',
          priority: 'high',
          title: `${overduePayments.length} overdue invoice${overduePayments.length > 1 ? 's' : ''}`,
          description: `Send reminders to collect ${overduePayments.reduce((sum, p) => sum + p.amount, 0) / 100} in unpaid invoices`,
          action: 'Send reminders',
          data: overduePayments,
        });
      }

      if (upcomingJobs && upcomingJobs.length > 0) {
        const jobsNeedingDeposit = upcomingJobs.filter(job => {
          // Check if deposit payment exists
          return !job.deposit_collected;
        });

        if (jobsNeedingDeposit.length > 0) {
          suggestions.push({
            type: 'deposit',
            priority: 'medium',
            title: `Collect deposits for ${jobsNeedingDeposit.length} upcoming job${jobsNeedingDeposit.length > 1 ? 's' : ''}`,
            description: 'Secure 25-50% deposits before scheduled work',
            action: 'Create payment links',
            data: jobsNeedingDeposit,
          });
        }
      }

      return new Response(
        JSON.stringify({ suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forecast revenue
    if (action === 'forecast') {
      const { horizonDays = 7 } = await req.json();

      const { data: openPayments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('org_id', org.id)
        .in('status', ['open', 'pending']);

      const { data: subscriptions } = await supabase
        .from('client_subscriptions')
        .select('*, service_plans!inner(price)')
        .eq('status', 'active');

      const prompt = `Based on this payment data, forecast expected revenue for the next ${horizonDays} days:
      
Open invoices: ${JSON.stringify(openPayments)}
Active subscriptions: ${JSON.stringify(subscriptions)}

Provide a realistic forecast considering:
1. Historical payment timing
2. Subscription renewals
3. Seasonal patterns
4. Collection likelihood

Return JSON: { expectedRevenue: number, confidence: "high"|"medium"|"low", breakdown: { invoices: number, subscriptions: number } }`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a financial forecasting assistant. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      const aiData = await aiResponse.json();
      const forecast = JSON.parse(aiData.choices[0].message.content);

      return new Response(
        JSON.stringify(forecast),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chase unpaid invoices
    if (action === 'chase_unpaid') {
      const { data: overduePayments } = await supabase
        .from('payments')
        .select('*, clients(name, email, phone)')
        .eq('org_id', org.id)
        .in('status', ['open', 'pending'])
        .lt('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

      const reminders = [];

      for (const payment of overduePayments || []) {
        const daysOverdue = Math.floor((Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        const prompt = `Create a professional payment reminder for:
Client: ${payment.clients.name}
Amount: $${payment.amount / 100}
Days overdue: ${daysOverdue}
Business: ${org.name}

Generate both SMS (160 chars) and email versions. Tone: friendly but firm.

Return JSON: { sms: string, email: { subject: string, body: string } }`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a professional collections assistant. Always respond with valid JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        const aiData = await aiResponse.json();
        const reminder = JSON.parse(aiData.choices[0].message.content);

        reminders.push({
          paymentId: payment.id,
          clientName: payment.clients.name,
          amount: payment.amount / 100,
          daysOverdue,
          ...reminder,
        });
      }

      return new Response(
        JSON.stringify({ reminders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Payments AI error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});