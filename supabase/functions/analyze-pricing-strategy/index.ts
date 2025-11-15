import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trade_type, service_area, category, your_rate_cents, strategy } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    console.log('LOVABLE_API_KEY available:', !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build detailed context for AI
    const categoryLabel = category === 'service_call' ? 'Service Call + Time & Materials' : 'Fixed-Scope Jobs';
    const rateDescription = category === 'service_call'
      ? `Trip charge: $${(strategy.service_call?.trip_charge_cents / 100).toFixed(2)}, Hourly: $${(strategy.service_call?.hourly_rate_cents / 100).toFixed(2)}`
      : `Base rate: $${(strategy.fixed_scope?.base_rate_cents / 100).toFixed(2)} (${strategy.fixed_scope?.base_rate_type})`;

    const systemPrompt = `You are an expert pricing analyst for home service businesses. Analyze the provider's pricing strategy and compare it to local market rates.

Trade: ${trade_type}
Service Area: ${service_area}
Pricing Model: ${categoryLabel}
Current Rates: ${rateDescription}
Overhead per job: $${(strategy.overhead_per_job_cents / 100).toFixed(2)}

Provide realistic market analysis based on:
1. Typical rates for ${trade_type} in ${service_area}
2. Industry standards for this pricing model
3. Whether they're undercharging, overcharging, or competitive
4. Specific recommendations with reasoning

Be practical and actionable. Consider regional differences, trade complexity, and business sustainability.`;

    const userPrompt = `Analyze this ${trade_type} provider's pricing strategy. They charge $${(your_rate_cents / 100).toFixed(2)} using a ${categoryLabel} model in ${service_area}. 

What is the typical local market median for this service? How do they compare? Provide assessment and reasoning.`;

    console.log('Calling Lovable AI for pricing analysis...');

    console.log('Calling Lovable AI...');
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
              name: 'analyze_market_pricing',
              description: 'Return market pricing analysis for a home service provider',
              parameters: {
                type: 'object',
                properties: {
                  local_median_cents: {
                    type: 'integer',
                    description: 'Local market median rate in cents'
                  },
                  market_range_low_cents: {
                    type: 'integer',
                    description: 'Lower bound of typical market range'
                  },
                  market_range_high_cents: {
                    type: 'integer',
                    description: 'Upper bound of typical market range'
                  },
                  your_vs_market_pct: {
                    type: 'number',
                    description: 'Percentage difference vs market median (positive = above, negative = below)'
                  },
                  assessment: {
                    type: 'string',
                    enum: ['Competitive', 'Undercharging', 'Premium Pricing', 'Overpriced'],
                    description: 'Overall assessment of their pricing'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['High', 'Medium', 'Low'],
                    description: 'Confidence level in this analysis'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Detailed explanation (2-3 sentences) with specific recommendations'
                  }
                },
                required: ['local_median_cents', 'your_vs_market_pct', 'assessment', 'confidence', 'reasoning'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_market_pricing' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const marketAnalysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ market_analysis: marketAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-pricing-strategy:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze pricing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
