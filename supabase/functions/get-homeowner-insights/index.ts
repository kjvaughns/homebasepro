import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { homeData, season } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const currentYear = new Date().getFullYear();
    const homeAge = homeData.year_built ? currentYear - homeData.year_built : 0;

    const prompt = `You are a home maintenance expert. Analyze this home and provide 3-5 actionable maintenance insights.

Home Details:
- Age: ${homeAge} years old (built ${homeData.year_built})
- Size: ${homeData.square_footage} sq ft
- Type: ${homeData.property_type}
- Bedrooms: ${homeData.bedrooms}
- Bathrooms: ${homeData.bathrooms}
- Location: ${homeData.zip_code}
- Current Season: ${season}

Provide insights in this exact JSON format:
{
  "insights": [
    {
      "title": "Short actionable title (max 10 words)",
      "description": "Detailed explanation and recommendation with context",
      "type": "tip|alert|suggestion",
      "priority": "high|normal|low",
      "category": "HVAC|Plumbing|Electrical|Exterior|Interior|Landscaping"
    }
  ]
}

Type guidelines:
- "tip" (blue icon): General advice, best practices, preventive maintenance tips
- "alert" (yellow icon): Urgent issues, age-based warnings, safety concerns that need attention soon
- "suggestion" (green icon): Optimization opportunities, cost-saving ideas, efficiency improvements

Focus on:
1. Age-based maintenance (type: "alert" for urgent, "tip" for preventive)
2. Seasonal maintenance (type: "suggestion")
3. Preventive care (type: "tip")
4. Cost-saving tips (type: "suggestion")
5. Safety concerns (type: "alert")

Return ONLY valid JSON, no markdown. Keep titles concise (max 10 words), descriptions detailed but focused.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a home maintenance expert providing actionable insights.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from AI response
    let insights;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      // Return fallback insights
      insights = {
        insights: [
          {
            title: "Schedule regular home inspections",
            description: "Based on your home's age and systems, regular inspections can prevent costly repairs and extend the life of major components.",
            type: "tip",
            priority: "normal",
            category: "General"
          }
        ]
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: [] // Return empty array on error
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
