import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();

    console.log('Processing follow-ups:', { action });

    if (action === 'process_pending') {
      // Get all pending follow-ups that are due
      const { data: pendingFollowUps, error } = await supabaseClient
        .from('follow_up_actions')
        .select('*, bookings(*), profiles!follow_up_actions_homeowner_id_fkey(*), organizations(*)')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);

      if (error) {
        console.error('Error fetching follow-ups:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`Found ${pendingFollowUps?.length || 0} pending follow-ups`);

      if (pendingFollowUps && pendingFollowUps.length > 0) {
        for (const followUp of pendingFollowUps) {
          // Mark as sent
          await supabaseClient
            .from('follow_up_actions')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', followUp.id);

          // In a production system, you would send actual notifications here
          // For now, we just mark them as sent so the frontend can display them
          console.log(`Processed follow-up: ${followUp.action_type} for booking ${followUp.booking_id}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: pendingFollowUps?.length || 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing follow-ups:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
