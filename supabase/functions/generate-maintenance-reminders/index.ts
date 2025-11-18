import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';

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

    const { action, booking_id, service_name, completion_date } = await req.json();

    console.log('Generating reminders:', { action, booking_id });

    if (action === 'post_service' && booking_id) {
      // Generate reminder after service completion
      const { data: booking } = await supabaseClient
        .from('bookings')
        .select('*, homes(*)')
        .eq('id', booking_id)
        .single();

      if (!booking) {
        return new Response(
          JSON.stringify({ error: 'Booking not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // HVAC services get 90-day reminder
      if (service_name?.toLowerCase().includes('hvac')) {
        const dueDate = new Date(completion_date || new Date());
        dueDate.setDate(dueDate.getDate() + 90);

        await supabaseClient.from('maintenance_reminders').insert({
          home_id: booking.home_id,
          homeowner_id: booking.homeowner_profile_id,
          reminder_type: 'hvac_90day',
          service_category: 'HVAC',
          due_date: dueDate.toISOString().split('T')[0],
          title: 'HVAC Maintenance Due',
          description: 'Your HVAC system should be serviced every 90 days for optimal performance.',
          priority: 'normal',
          last_service_date: completion_date?.split('T')[0] || new Date().toISOString().split('T')[0]
        });
      }

      // Gutter cleaning gets annual fall reminder
      if (service_name?.toLowerCase().includes('gutter')) {
        const nextFall = new Date();
        nextFall.setMonth(8); // September
        if (nextFall < new Date()) {
          nextFall.setFullYear(nextFall.getFullYear() + 1);
        }

        await supabaseClient.from('maintenance_reminders').insert({
          home_id: booking.home_id,
          homeowner_id: booking.homeowner_profile_id,
          reminder_type: 'seasonal_gutter',
          service_category: 'Exterior',
          due_date: nextFall.toISOString().split('T')[0],
          title: 'Fall Gutter Cleaning',
          description: 'Clean gutters before winter to prevent ice dams and water damage.',
          priority: 'normal'
        });
      }
    }

    if (action === 'daily_check') {
      // Generate seasonal reminders for all homes
      const today = new Date();
      const month = today.getMonth();

      // Spring HVAC reminders (March)
      if (month === 2) {
        const { data: homes } = await supabaseClient
          .from('homes')
          .select('*, profiles!homes_owner_id_fkey(id)');

        if (homes) {
          for (const home of homes) {
            // Check if reminder already exists
            const { data: existing } = await supabaseClient
              .from('maintenance_reminders')
              .select('id')
              .eq('home_id', home.id)
              .eq('reminder_type', 'seasonal_hvac_spring')
              .gte('created_at', `${today.getFullYear()}-01-01`)
              .single();

            if (!existing) {
              await supabaseClient.from('maintenance_reminders').insert({
                home_id: home.id,
                homeowner_id: home.profiles.id,
                reminder_type: 'seasonal_hvac_spring',
                service_category: 'HVAC',
                due_date: `${today.getFullYear()}-03-31`,
                title: 'Spring HVAC Tune-Up',
                description: 'Schedule your spring AC tune-up before the heat arrives.',
                priority: 'high'
              });
            }
          }
        }
      }

      // Fall HVAC reminders (September)
      if (month === 8) {
        const { data: homes } = await supabaseClient
          .from('homes')
          .select('*, profiles!homes_owner_id_fkey(id)');

        if (homes) {
          for (const home of homes) {
            const { data: existing } = await supabaseClient
              .from('maintenance_reminders')
              .select('id')
              .eq('home_id', home.id)
              .eq('reminder_type', 'seasonal_hvac_fall')
              .gte('created_at', `${today.getFullYear()}-07-01`)
              .single();

            if (!existing) {
              await supabaseClient.from('maintenance_reminders').insert({
                home_id: home.id,
                homeowner_id: home.profiles.id,
                reminder_type: 'seasonal_hvac_fall',
                service_category: 'HVAC',
                due_date: `${today.getFullYear()}-10-31`,
                title: 'Fall Heating System Check',
                description: 'Get your heating system ready for winter.',
                priority: 'high'
              });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Reminders generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
