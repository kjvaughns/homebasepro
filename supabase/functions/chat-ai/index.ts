import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversation_id, action, ...params } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Fetch conversation messages for context
    const messagesRes = await fetch(
      `${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversation_id}&order=created_at.asc&limit=50`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const messages = await messagesRes.json();
    
    // Fetch conversation details
    const convRes = await fetch(
      `${supabaseUrl}/rest/v1/conversations?id=eq.${conversation_id}&select=*,job_id`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const [conversation] = await convRes.json();
    
    // Build context
    const messageContext = messages.map((m: any) => 
      `[${new Date(m.created_at).toLocaleTimeString()}] ${m.sender_type}: ${m.content || m.body || ''}`
    ).join('\n');
    
    const systemPrompt = `You are HomeBase AI inside the Messages app.
- Be extremely concise (1-2 sentences max)
- Use conversation context automatically
- Prefer actions over explanations
- Never expose tool names or technical details

Current conversation context:
${messageContext}

Available actions:
- summarize: Create brief 3-bullet summary
- suggest: Provide 2-3 quick reply options
- make_quote: Generate quote details from discussion
- extract_intent: Detect booking/quote/reschedule/issue intents`;

    let result: any = {};
    
    switch (action) {
      case 'summarize':
        result = {
          summary: [
            '• ' + (messages.length > 0 ? 'Conversation started about ' + (conversation?.title || 'service request') : 'New conversation'),
            '• ' + messages.length + ' messages exchanged',
            '• ' + (conversation?.job_id ? 'Linked to active job' : 'No job created yet')
          ]
        };
        break;
        
      case 'suggest':
        // Simple suggestions based on last message
        const lastMsg = messages[messages.length - 1];
        const suggestions = [
          "Thanks! I'll get that scheduled for you.",
          "Let me check availability and get back to you shortly.",
          "Would you like me to send over a quote?"
        ];
        result = { suggestions };
        break;
        
      case 'make_quote':
        result = {
          quote: {
            service_name: params.service_name || 'Service',
            low: params.low || 150,
            high: params.high || 300,
            note: 'Estimated range based on typical service costs'
          }
        };
        break;
        
      case 'extract_intent':
        // Simple keyword-based intent detection
        const fullText = messageContext.toLowerCase();
        let intent = 'general';
        if (fullText.includes('book') || fullText.includes('schedule')) intent = 'book';
        else if (fullText.includes('quote') || fullText.includes('price') || fullText.includes('cost')) intent = 'quote';
        else if (fullText.includes('reschedule') || fullText.includes('change time')) intent = 'reschedule';
        else if (fullText.includes('issue') || fullText.includes('problem')) intent = 'issue';
        
        result = { intent, details: {} };
        break;
        
      default:
        result = { error: 'Unknown action' };
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('chat-ai error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});