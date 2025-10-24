import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/16944064/urn3793/';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid authentication');

    const { subject, description, category, priority } = await req.json();

    if (!subject || !description) {
      throw new Error('Subject and description are required');
    }

    console.log('Creating support ticket for user:', user.id);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_type')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Insert support ticket
    const { data: ticket, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        profile_id: profile?.id,
        subject,
        description,
        category: category || 'other',
        priority: priority || 'medium',
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting ticket:', insertError);
      throw insertError;
    }

    console.log('Support ticket created:', ticket.ticket_number);

    // Send to Zapier webhook
    const zapierPayload = {
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      user_name: profile?.full_name || 'Unknown',
      user_email: profile?.email || user.email,
      user_type: profile?.user_type || 'unknown',
      subject,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      status: 'open',
      created_at: ticket.created_at,
      dashboard_url: `${Deno.env.get('APP_URL') || 'https://homebaseproapp.com'}/admin/support`
    };

    console.log('Sending to Zapier:', zapierPayload);

    // Send to Zapier (fire-and-forget, don't block on response)
    fetch(ZAPIER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapierPayload)
    }).catch(err => console.error('Zapier webhook error:', err));

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Submit support ticket error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
