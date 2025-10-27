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
    const { service_name, base_price, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Pricing analysis request:', { service_name, base_price });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a pricing expert for home service businesses. Analyze service requests and suggest fair market pricing based on industry standards, location, and complexity. Always provide practical price ranges that balance profitability with market competitiveness.'
          },
          {
            role: 'user',
            content: `Analyze this service request and suggest pricing:\n\n${context}\n\nProvide a price range (low/high) and brief justification. Consider local market rates, parts cost, labor, and complexity.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_pricing",
            description: "Suggest pricing range for service",
            parameters: {
              type: "object",
              properties: {
                price_low: { type: "number", description: "Lower bound in cents" },
                price_high: { type: "number", description: "Upper bound in cents" },
                reasoning: { type: "string", description: "Brief explanation (1-2 sentences)" },
                confidence: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["price_low", "price_high", "reasoning"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_pricing" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please add credits to your workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.warn('No tool call in response, using fallback');
      const fallbackPricing = {
        price_low: Math.round(base_price * 0.9),
        price_high: Math.round(base_price * 1.2),
        reasoning: "Based on your service catalog pricing with typical market adjustments.",
        confidence: "medium"
      };
      
      return new Response(JSON.stringify(fallbackPricing), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const pricing = JSON.parse(toolCall.function.arguments);
    console.log('Pricing analysis complete:', pricing);

    return new Response(JSON.stringify(pricing), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Pricing engine error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate pricing suggestion'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
