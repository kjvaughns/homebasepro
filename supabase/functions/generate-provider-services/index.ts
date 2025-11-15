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
    const { tradeType, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a service generation assistant for HomeBase, a platform for home service providers. 
Generate 4-6 realistic services based on the trade type and user's description. 
Each service should have: name, description (1 sentence), base_price_cents (integer), duration_minutes (integer).
Return ONLY a valid JSON array, no other text.`;

    const userPrompt = `Trade: ${tradeType}\nDescription: ${description}\n\nGenerate services as JSON array with format: [{"name":"Service Name","description":"Brief description","base_price_cents":5000,"duration_minutes":60}]`;

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
            name: 'generate_services',
            description: 'Generate service offerings',
            parameters: {
              type: 'object',
              properties: {
                services: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      base_price_cents: { type: 'integer' },
                      duration_minutes: { type: 'integer' }
                    },
                    required: ['name', 'description', 'base_price_cents', 'duration_minutes']
                  }
                }
              },
              required: ['services']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_services' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ services: result.services }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating services:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to generate services' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});