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
    const { session_id, message, context } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create session
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const { data: newSession } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          context: context || {}
        })
        .select()
        .single();
      currentSessionId = newSession?.id;
    }

    // Load recent history (last 10 messages)
    const { data: history } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentHistory = (history || []).reverse();

    // Save user message
    await supabase.from('ai_chat_messages').insert({
      session_id: currentSessionId,
      role: 'user',
      content: message
    });

    // System prompt
    const systemPrompt = `You are HomeBase Support AI, helping users get instant property lookups and service price estimates.

Key capabilities:
- When a user provides a street address, use lookup_home to fetch property details
- For pricing requests, use price_service with the service name and unit type
- If units are unknown (e.g., linear feet of gutters), ask ONE short follow-up question
- After tool results, provide a clear summary and suggest next steps

Common services and unit types:
- Lawn Mowing/Care: acre (from lot size)
- HVAC Service: system_count
- Gutter Cleaning: linear_foot
- Window Cleaning: pane
- Pool Cleaning: flat
- Pressure Washing: sqft

Be concise, helpful, and confident. Always explain pricing breakdowns when available.`;

    // Define tools
    const tools = [
      {
        type: 'function',
        function: {
          name: 'lookup_home',
          description: 'Look up property details for a street address using Zillow data',
          parameters: {
            type: 'object',
            properties: {
              address: { 
                type: 'string', 
                description: 'Full street address including city and state' 
              }
            },
            required: ['address']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'price_service',
          description: 'Calculate dynamic price estimate for a home service',
          parameters: {
            type: 'object',
            properties: {
              service_name: { 
                type: 'string',
                description: 'Name of the service (e.g., "Lawn Mowing", "HVAC Tune-Up")'
              },
              unit_type: { 
                type: 'string',
                enum: ['acre', 'sqft', 'linear_foot', 'pane', 'system_count', 'flat'],
                description: 'Unit type for pricing'
              },
              units: { type: 'number', description: 'Number of units (optional if deriving from property)' },
              lot_acres: { type: 'number' },
              sqft: { type: 'number' },
              beds: { type: 'number' },
              baths: { type: 'number' },
              year_built: { type: 'number' },
              zip: { type: 'string' },
              month: { type: 'number', description: '1-12' }
            },
            required: ['service_name', 'unit_type']
          }
        }
      }
    ];

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto'
      })
    });

    let result = await response.json();
    let aiMessage = result.choices?.[0]?.message;
    const toolResults: any[] = [];

    // Handle tool calls (up to 2 rounds)
    for (let round = 0; round < 2 && aiMessage?.tool_calls; round++) {
      const calls = aiMessage.tool_calls;
      const toolMessages: any[] = [];

      for (const call of calls) {
        const fnName = call.function?.name;
        const args = JSON.parse(call.function?.arguments || '{}');

        if (fnName === 'lookup_home') {
          console.log('Calling lookup-home with:', args.address);
          const lookupRes = await supabase.functions.invoke('lookup-home', {
            body: { address: args.address }
          });

          const lookupData = lookupRes.data;
          toolResults.push({ type: 'property', data: lookupData });
          
          toolMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: 'lookup_home',
            content: JSON.stringify(lookupData)
          });
        }

        if (fnName === 'price_service') {
          console.log('Calling pricing-engine with:', args);
          const priceRes = await supabase.functions.invoke('pricing-engine', {
            body: { 
              ...args,
              session_id: currentSessionId
            }
          });

          const priceData = priceRes.data;
          toolResults.push({ type: 'price', data: priceData });

          toolMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: 'price_service',
            content: JSON.stringify(priceData)
          });
        }
      }

      // Get AI response with tool results
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...messages,
            { role: 'assistant', content: aiMessage.content || '', tool_calls: calls },
            ...toolMessages
          ]
        })
      });

      result = await response.json();
      aiMessage = result.choices?.[0]?.message;
    }

    const finalReply = aiMessage?.content || 'All set.';

    // Save assistant message
    await supabase.from('ai_chat_messages').insert({
      session_id: currentSessionId,
      role: 'assistant',
      content: finalReply
    });

    // Update session timestamp
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId);

    return new Response(
      JSON.stringify({
        reply: finalReply,
        session_id: currentSessionId,
        tool_results: toolResults.length > 0 ? toolResults : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assistant:', error);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
