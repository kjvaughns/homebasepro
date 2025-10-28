import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // This function runs as a background job to collect AI learning data
    // It analyzes completed workflows and logs learning events

    // 1. Find recently completed bookings with quotes
    const { data: completedBookings } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        quotes!quotes_converted_to_booking_id_fkey(*)
      `)
      .eq('status', 'completed')
      .not('quotes', 'is', null)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (!completedBookings || completedBookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new completed bookings to process" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const learningEvents = [];

    for (const booking of completedBookings) {
      const quote = booking.quotes?.[0];
      if (!quote) continue;

      // Check if we already logged this
      const { data: existing } = await supabaseClient
        .from('ai_learning_events')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('event_type', 'job_outcome')
        .single();

      if (existing) continue;

      // Calculate pricing accuracy
      const estimatedPrice = quote.total_amount;
      const actualPrice = booking.final_price || booking.deposit_amount || 0;
      const accuracy = actualPrice > 0 ? Math.min(1.0, actualPrice / estimatedPrice) : 0;

      // Calculate duration accuracy
      const estimatedDuration = quote.pricing_factors?.estimated_duration || 0;
      const actualDuration = booking.updated_at && booking.date_time_start
        ? (new Date(booking.updated_at).getTime() - new Date(booking.date_time_start).getTime()) / 1000
        : 0;

      // Anonymize data
      const { data: home } = await supabaseClient
        .from('homes')
        .select('zip_code, square_footage')
        .eq('id', booking.home_id)
        .single();

      const propertySize = home?.square_footage
        ? home.square_footage < 1500 ? 'small' : home.square_footage < 2500 ? 'medium' : 'large'
        : 'unknown';

      learningEvents.push({
        event_type: 'job_outcome',
        service_request_id: quote.service_request_id,
        quote_id: quote.id,
        booking_id: booking.id,
        provider_org_id: booking.provider_org_id,
        ai_predicted: {
          estimated_price: estimatedPrice,
          estimated_duration: estimatedDuration,
          confidence: quote.ai_confidence || 0.5
        },
        actual_outcome: {
          final_price: actualPrice,
          actual_duration: actualDuration,
          completed: true
        },
        accuracy_score: accuracy,
        service_category: booking.service_name,
        region_zip: home?.zip_code?.slice(0, 3) + "XX" || "unknown",
        property_size_bucket: propertySize,
        complexity_factors: []
      });
    }

    // Batch insert learning events
    if (learningEvents.length > 0) {
      const { error } = await supabaseClient
        .from('ai_learning_events')
        .insert(learningEvents);

      if (error) throw error;
    }

    // 2. Analyze quote acceptance/rejection for provider matching feedback
    const { data: recentQuotes } = await supabaseClient
      .from('quotes')
      .select('*')
      .in('status', ['accepted', 'rejected'])
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    const matchingEvents = [];

    for (const quote of recentQuotes || []) {
      // Check if already logged
      const { data: existing } = await supabaseClient
        .from('ai_learning_events')
        .select('id')
        .eq('quote_id', quote.id)
        .eq('event_type', 'quote_accuracy')
        .single();

      if (existing) continue;

      matchingEvents.push({
        event_type: 'quote_accuracy',
        quote_id: quote.id,
        service_request_id: quote.service_request_id,
        provider_org_id: quote.provider_org_id,
        ai_predicted: {
          quote_amount: quote.total_amount,
          confidence: quote.ai_confidence || 0.5
        },
        actual_outcome: {
          accepted: quote.status === 'accepted',
          rejection_reason: quote.rejection_reason || null
        },
        accuracy_score: quote.status === 'accepted' ? 1.0 : 0.0,
        service_category: quote.service_name
      });
    }

    if (matchingEvents.length > 0) {
      const { error } = await supabaseClient
        .from('ai_learning_events')
        .insert(matchingEvents);

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_outcomes_logged: learningEvents.length,
        quote_feedback_logged: matchingEvents.length,
        total_events: learningEvents.length + matchingEvents.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error collecting AI feedback:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
