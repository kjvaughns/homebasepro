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

    // Generate line items based on service type
    const lineItems = [];
    if (service_name.toLowerCase().includes('hvac')) {
      lineItems.push(
        { name: "System Inspection", description: "Complete diagnostic check", amount: 5000 },
        { name: "Filter Replacement", description: "Premium air filter", amount: 3000 }
      );
    } else if (service_name.toLowerCase().includes('plumb')) {
      lineItems.push(
        { name: "Leak Detection", description: "Advanced leak detection", amount: 7500 },
        { name: "Parts & Fittings", description: "Standard plumbing parts", amount: 5000 }
      );
    } else if (service_name.toLowerCase().includes('electric')) {
      lineItems.push(
        { name: "Electrical Inspection", description: "Safety inspection", amount: 10000 },
        { name: "Circuit Testing", description: "Complete circuit analysis", amount: 5000 }
      );
    }

    const response = {
      suggested_labor_cost: avgLabor,
      suggested_parts_cost: avgParts,
      confidence: confidence,
      line_items: lineItems,
      similar_jobs: learningEvents?.length || 0,
      pricing_factors: {
        service_type: service_name,
        data_points: learningEvents?.length || 0,
        region: serviceCallData?.homes?.zip_code?.slice(0, 3) + "XX" || "unknown",
        confidence_level: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low'
      },
      explanation: `Based on ${learningEvents?.length || 0} similar jobs, we suggest starting with $${(avgLabor / 100).toFixed(2)} for labor and $${(avgParts / 100).toFixed(2)} for parts. Adjust based on your specific situation.`
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
