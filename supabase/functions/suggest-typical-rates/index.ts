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
    const { tradeType, serviceArea, category } = await req.json();
    
    console.log('Suggesting rates for:', { tradeType, serviceArea, category });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a pricing expert for home service businesses. Provide realistic, market-based rate suggestions based on trade type, location, and service category.`;

    const userPrompt = `Suggest typical rates for a ${tradeType} business in ${serviceArea} for ${category} pricing.
    
Provide:
- Trip charge range (if applicable for service_call)
- Hourly rate range (if applicable)
- Material markup percentage (if applicable for fixed_scope)
- Overhead per job (typical range)

Format your response as JSON with this structure:
{
  "trip_charge": { "low": 50, "typical": 75, "high": 125 },
  "hourly_rate": { "low": 75, "typical": 100, "high": 150 },
  "material_markup": { "low": 15, "typical": 25, "high": 40 },
  "overhead": { "low": 25, "typical": 50, "high": 100 },
  "reasoning": "Brief explanation of these rates for this market"
}

Use null for fields that don't apply to this pricing category.`;

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
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_rates',
            description: 'Return typical rate ranges for this trade and location',
            parameters: {
              type: 'object',
              properties: {
                trip_charge: {
                  type: 'object',
                  properties: {
                    low: { type: 'number' },
                    typical: { type: 'number' },
                    high: { type: 'number' }
                  }
                },
                hourly_rate: {
                  type: 'object',
                  properties: {
                    low: { type: 'number' },
                    typical: { type: 'number' },
                    high: { type: 'number' }
                  }
                },
                material_markup: {
                  type: 'object',
                  properties: {
                    low: { type: 'number' },
                    typical: { type: 'number' },
                    high: { type: 'number' }
                  }
                },
                overhead: {
                  type: 'object',
                  properties: {
                    low: { type: 'number' },
                    typical: { type: 'number' },
                    high: { type: 'number' }
                  }
                },
                reasoning: { type: 'string' }
              },
              required: ['reasoning'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_rates' } }
      }),
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits to your workspace.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to get rate suggestions from AI');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No rate suggestions returned from AI');
    }

    const suggestions = JSON.parse(toolCall.function.arguments);
    console.log('Generated rate suggestions:', suggestions);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in suggest-typical-rates:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to suggest rates' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
