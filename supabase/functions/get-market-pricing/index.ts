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
    const { trade_type, service_area, category } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('market_pricing_cache')
      .select('*')
      .eq('trade_type', trade_type)
      .eq('service_area', service_area)
      .eq('category', category)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!cacheError && cached) {
      console.log('Returning cached market data');
      return new Response(
        JSON.stringify({ 
          cached: true,
          data: cached 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No cache, generate fresh data via AI
    console.log('No cache found, calling AI for market research');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a market research analyst for home service businesses. Research typical pricing for ${trade_type} services in ${service_area} using a ${category} model.`;

    const userPrompt = `What are typical ${category === 'service_call' ? 'service call charges and hourly rates' : 'fixed-scope rates'} for ${trade_type} providers in ${service_area}? Provide median and range.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_market_data',
              description: 'Report typical market pricing data',
              parameters: {
                type: 'object',
                properties: {
                  local_median_cents: { type: 'integer' },
                  market_range_low_cents: { type: 'integer' },
                  market_range_high_cents: { type: 'integer' },
                  data_points: { type: 'integer', description: 'Estimated sample size' },
                  confidence_level: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                },
                required: ['local_median_cents', 'market_range_low_cents', 'market_range_high_cents'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'report_market_data' } }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const marketData = JSON.parse(toolCall.function.arguments);

    // Cache the result
    await supabase
      .from('market_pricing_cache')
      .upsert({
        trade_type,
        service_area,
        category,
        local_median_cents: marketData.local_median_cents,
        market_range_low_cents: marketData.market_range_low_cents,
        market_range_high_cents: marketData.market_range_high_cents,
        data_points: marketData.data_points || 0,
        confidence_level: marketData.confidence_level || 'Medium',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }, {
        onConflict: 'trade_type,service_area,category'
      });

    return new Response(
      JSON.stringify({ 
        cached: false,
        data: marketData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in get-market-pricing:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get market pricing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
