import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user and organization
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, service_type')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    const serviceTypes = org.service_type || [];
    const businessType = serviceTypes.length > 0 ? serviceTypes.join(', ') : 'General Home Services';

    // Call Lovable AI to suggest parts
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for a ${businessType} business. Generate a comprehensive list of 30-50 common parts and materials they would typically use. Include realistic cost prices (in cents, so $25.50 = 2550) and suggested markup percentages based on industry standards. Return ONLY valid JSON with no markdown formatting.`
          },
          {
            role: 'user',
            content: `Generate parts/materials list for: ${businessType}. Format as JSON array with objects containing: name, sku (optional), category, cost_price (in cents), markup_percentage, supplier (optional). Example: [{"name":"PVC Pipe 1/2 inch","sku":"PVC-050","category":"Plumbing","cost_price":350,"markup_percentage":45,"supplier":"Home Depot"}]`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_parts",
              description: "Return a list of common parts and materials for this business type",
              parameters: {
                type: "object",
                properties: {
                  parts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        sku: { type: "string" },
                        category: { type: "string" },
                        cost_price: { type: "number" },
                        markup_percentage: { type: "number" },
                        supplier: { type: "string" }
                      },
                      required: ["name", "category", "cost_price", "markup_percentage"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["parts"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_parts" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI request failed');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const parts = toolCall ? JSON.parse(toolCall.function.arguments).parts : [];

    // Add organization_id to each part
    const partsWithOrg = parts.map((part: any) => ({
      ...part,
      organization_id: org.id,
      sell_price: Math.round(part.cost_price * (1 + part.markup_percentage / 100)),
      unit: 'each',
      is_active: true
    }));

    return new Response(JSON.stringify({ parts: partsWithOrg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in suggest-parts-materials:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
