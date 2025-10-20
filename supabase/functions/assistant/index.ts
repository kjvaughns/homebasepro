import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
      return new Response(JSON.stringify({ error: 'Message required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('profiles').select('id, user_type').eq('user_id', user.id).single();
    const profileId = profile?.id;
    const role = profile?.user_type || 'homeowner';

    let activeSessionId = session_id;
    if (!activeSessionId) {
      const { data: newSession } = await supabase.from('ai_chat_sessions')
        .insert({ user_id: user.id, profile_id: profileId, context: context || {} }).select('id').single();
      activeSessionId = newSession?.id;
    }

    const { data: history } = await supabase.from('ai_chat_messages').select('role, content')
      .eq('session_id', activeSessionId).order('created_at', { ascending: true }).limit(10);

    await supabase.from('ai_chat_messages').insert({ session_id: activeSessionId, role: 'user', content: message });

    const systemPrompt = `You are HomeBase AI. Help ${role === 'provider' ? 'providers manage jobs, rates, and schedules' : 'homeowners get quotes, find providers, and book services'}. Keep answers 1-4 sentences. Ask at most ONE clarifying question. Never expose technical details.`;

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    if (history?.length) messages.push(...history.map(h => ({ role: h.role, content: h.content })));
    messages.push({ role: 'user', content: message });

    const tools = role === 'provider' ? [
      { type: 'function', function: { name: 'list_jobs', parameters: { type: 'object', properties: { timeframe: { type: 'string' } }, required: ['timeframe'] } } }
    ] : [
      { type: 'function', function: { name: 'lookup_home', parameters: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] } } },
      { type: 'function', function: { name: 'price_service', parameters: { type: 'object', properties: { service_name: { type: 'string' }, unit_type: { type: 'string' } }, required: ['service_name', 'unit_type'] } } }
    ];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages, tools, tool_choice: 'auto' })
    });

    if (aiResponse.status === 429 || aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: 'rate_limit', message: 'Service busy. Try again soon.' }), 
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;
    let toolResults: any[] = [];

    if (assistantMessage?.tool_calls?.length) {
      for (const tc of assistantMessage.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        let result: any = null;

        if (tc.function.name === 'lookup_home') {
          const res = await supabase.functions.invoke('lookup-home', { body: { address: args.address } });
          result = res.data;
        } else if (tc.function.name === 'price_service') {
          const res = await supabase.functions.invoke('price-service', { body: args });
          result = res.data;
        }

        toolResults.push({ tool: tc.function.name, result });
      }

      messages.push({ role: 'user', content: `Results: ${JSON.stringify(toolResults)}. Give short summary.` });
      const finalRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages, tool_choice: 'none' })
      });
      assistantMessage = (await finalRes.json()).choices?.[0]?.message;
    }

    const reply = assistantMessage?.content || "How can I help you?";

    await supabase.from('ai_chat_messages').insert({ session_id: activeSessionId, role: 'assistant', content: reply, tool_calls: toolResults.length ? toolResults : null });
    await supabase.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', activeSessionId);

    return new Response(JSON.stringify({ reply, session_id: activeSessionId, tool_results: toolResults.length ? toolResults : undefined }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
