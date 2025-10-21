import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewText } = await req.json();

    if (!reviewText) {
      throw new Error('Review text is required');
    }

    // Use Lovable AI to analyze sentiment
    const response = await fetch('https://api.aimlapi.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('AIML_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analyzer. Respond with ONLY one word: "positive", "neutral", or "negative".'
          },
          {
            role: 'user',
            content: `Analyze the sentiment of this service provider review: "${reviewText}"`
          }
        ],
        max_tokens: 10,
      }),
    });

    const data = await response.json();
    const sentiment = data.choices[0].message.content.trim().toLowerCase();

    // Validate sentiment
    const validSentiments = ['positive', 'neutral', 'negative'];
    const finalSentiment = validSentiments.includes(sentiment) ? sentiment : 'neutral';

    return new Response(
      JSON.stringify({ sentiment: finalSentiment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-review-sentiment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, sentiment: 'neutral' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});