import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const { text, trade } = await req.json();

    console.log('🤖 Generating services for:', trade);

    const prompt = `You are helping a ${trade} business owner define their service offerings.

Based on this description: "${text}"

Generate 3-5 specific services they could offer. For each service, provide:
- name: Clear, customer-friendly service name
- description: 1-2 sentence description of what's included
- duration_minutes: Estimated time to complete (realistic)
- suggested_price_cents: Reasonable market rate in cents (e.g., 15000 = $150)
- category: Service category

Return ONLY a valid JSON array of services, no other text:
[
  {
    "name": "Service Name",
    "description": "Brief description",
    "duration_minutes": 120,
    "suggested_price_cents": 15000,
    "category": "Maintenance"
  }
]`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000
      })
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI API error:', error);
      throw new Error('Failed to generate services');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content?.trim() || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const services = JSON.parse(jsonMatch[0]);

    console.log('✅ Generated', services.length, 'services');

    return new Response(
      JSON.stringify({ services }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error generating services:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});