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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { service_name, description, service_call_id } = await req.json();

    if (!service_name) {
      throw new Error("Service name is required");
    }

    // Get service call details if provided
    let serviceCallData = null;
    if (service_call_id) {
      const { data } = await supabaseClient
        .from('service_calls')
        .select('*, homes(*)')
        .eq('id', service_call_id)
        .single();
      serviceCallData = data;
    }

    // Analyze similar jobs for pricing intelligence
    const { data: learningEvents } = await supabaseClient
      .from('ai_learning_events')
      .select('*')
      .eq('event_type', 'job_outcome')
      .ilike('service_category', `%${service_name}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate average pricing from learning data
    let avgLabor = 0;
    let avgParts = 0;
    let confidence = 0.5;

    if (learningEvents && learningEvents.length > 0) {
      const validEvents = learningEvents.filter(e => 
        e.actual_outcome?.final_price && e.actual_outcome.final_price > 0
      );

      if (validEvents.length > 0) {
        const totalPrice = validEvents.reduce((sum, e) => 
          sum + (e.actual_outcome.final_price || 0), 0
        );
        const avgPrice = totalPrice / validEvents.length;

        // Estimate 60% labor, 40% parts
        avgLabor = Math.round(avgPrice * 0.6);
        avgParts = Math.round(avgPrice * 0.4);

        // Confidence based on data availability
        confidence = Math.min(0.95, 0.5 + (validEvents.length / 100));
      }
    }

    // Default fallback pricing if no learning data
    if (avgLabor === 0) {
      avgLabor = 15000; // $150
      avgParts = 10000; // $100
      confidence = 0.3;
    }

    // Seasonal pricing adjustments
    const currentMonth = new Date().getMonth();
    const isHighSeason = [5, 6, 7, 11, 0, 1].includes(currentMonth); // Summer & Winter
    const seasonalMultiplier = isHighSeason ? 1.15 : 1.0;

    avgLabor = Math.round(avgLabor * seasonalMultiplier);
    avgParts = Math.round(avgParts * seasonalMultiplier);

    // Generate enhanced line items based on service type
    const lineItems = [];
    const serviceLower = service_name.toLowerCase();
    
    if (serviceLower.includes('hvac') || serviceLower.includes('ac') || serviceLower.includes('heating')) {
      lineItems.push(
        { name: "System Inspection", description: "Complete diagnostic check", amount: Math.round(5000 * seasonalMultiplier) },
        { name: "Filter Replacement", description: "Premium air filter", amount: Math.round(3000 * seasonalMultiplier) }
      );
      if (isHighSeason) {
        lineItems.push(
          { name: "Priority Service Fee", description: "Peak season scheduling", amount: 2500 }
        );
      }
    } else if (serviceLower.includes('plumb')) {
      lineItems.push(
        { name: "Leak Detection", description: "Advanced leak detection", amount: 7500 },
        { name: "Parts & Fittings", description: "Standard plumbing parts", amount: 5000 }
      );
    } else if (serviceLower.includes('electric')) {
      lineItems.push(
        { name: "Electrical Inspection", description: "Safety inspection", amount: 10000 },
        { name: "Circuit Testing", description: "Complete circuit analysis", amount: 5000 }
      );
    } else if (serviceLower.includes('lawn') || serviceLower.includes('landscape')) {
      lineItems.push(
        { name: "Service Visit", description: "Professional maintenance", amount: 8000 },
        { name: "Materials", description: "Fertilizer and supplies", amount: 4000 }
      );
    } else if (serviceLower.includes('clean')) {
      lineItems.push(
        { name: "Deep Cleaning", description: "Comprehensive service", amount: 12000 },
        { name: "Supplies", description: "Professional-grade products", amount: 2000 }
      );
    }

    // Add upsell suggestion if confidence is high
    let upsellSuggestion = null;
    if (confidence > 0.7 && learningEvents && learningEvents.length > 5) {
      if (serviceLower.includes('hvac')) {
        upsellSuggestion = "Consider adding preventive maintenance plan for 15% discount on future services";
      } else if (serviceLower.includes('plumb')) {
        upsellSuggestion = "Water heater inspection recommended with this service";
      }
    }

    // Calculate price range
    const totalEstimate = avgLabor + avgParts;
    const lowEstimate = Math.round(totalEstimate * 0.85);
    const highEstimate = Math.round(totalEstimate * 1.15);

    const response = {
      suggested_labor_cost: avgLabor,
      suggested_parts_cost: avgParts,
      confidence: confidence,
      line_items: lineItems,
      similar_jobs: learningEvents?.length || 0,
      price_range: {
        low: lowEstimate,
        mid: totalEstimate,
        high: highEstimate
      },
      upsell_suggestion: upsellSuggestion,
      pricing_factors: {
        service_type: service_name,
        data_points: learningEvents?.length || 0,
        region: serviceCallData?.homes?.zip_code?.slice(0, 3) + "XX" || "unknown",
        confidence_level: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
        seasonal_adjustment: isHighSeason ? '+15% (peak season)' : 'standard',
        market_position: confidence > 0.7 ? 'competitive' : 'estimated'
      },
      explanation: `${isHighSeason ? '🔥 Peak season pricing applied. ' : ''}Based on ${learningEvents?.length || 0} similar jobs in your area, we suggest $${(lowEstimate / 100).toFixed(0)}-${(highEstimate / 100).toFixed(0)}. Labor: $${(avgLabor / 100).toFixed(2)}, Parts: $${(avgParts / 100).toFixed(2)}. ${upsellSuggestion ? '💡 ' + upsellSuggestion : ''}`
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error generating quote:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
