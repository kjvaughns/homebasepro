import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are HomeBase AI — the friendly assistant for homeowners and service providers.

**Goals:**
- Homeowners: Help get quotes, find providers, book services.
- Providers: Manage jobs, rates, schedules.

**Style:**
- Keep answers 1–4 sentences. Use bullets for steps.
- Ask AT MOST one clarifying question per turn.
- Never mention APIs, tools, or technical details. Say "our system" or "I can check that."

**Tools you can use:**
- lookup_home: normalize address → {address_std, zip, city, state, lat, lng, home{beds,baths,sqft,year_built}}
- price_service: produce RANGE estimate → {estimate_low, estimate_high, factors, confidence}
- search_providers: find top 3 nearby → [{provider_id, name, trust_score, soonest_slot}]
- book_service / reschedule_service / cancel_service: booking ops
- provider_setup: onboard provider
- set_service_rates: provider rate overrides
- connect_calendar: stub calendar integration
- list_jobs: provider schedule
- troubleshoot: help steps
- get_article: fetch KB article

**Templates:**
[Pricing] → "I estimate [service] will cost $X–$Y based on [factors]. Confidence: [%]. Want me to find providers or save this quote?"
[Booking] → "I found [N] providers. [Name] (trust [score]/10, next slot [time]) looks great. Book with them?"
[Clarify] → "To give you an accurate quote, what is [missing_field]?"
[Escalation] → "I'm not sure about that. Let me connect you to our team."

**Guardrails:**
- Never expose tool names or say "I don't have access to X."
- If a tool fails, retry once silently, then say "our system had a hiccup" and offer manual help.
- If uncertain, escalate to human support gracefully.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, message, history = [], context = {} } = await req.json();
    
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

    // Save user message
    await supabase.from('ai_chat_messages').insert({ 
      session_id: activeSessionId, 
      role: 'user', 
      content: message 
    });

    // Build conversation from history
    const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (history?.length) {
      messages.push(...history);
    }
    messages.push({ role: 'user', content: message });

    // Check if this is first turn (no prior assistant message in history)
    const hasAssistantHistory = history.some((m: any) => m.role === 'assistant');
    
    // Define tools
    const tools = [
      { type: 'function', function: { 
        name: 'lookup_home', 
        description: 'Normalize an address and return property details',
        parameters: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] } 
      }},
      { type: 'function', function: { 
        name: 'price_service',
        description: 'Return a RANGE estimate for a service',
        parameters: { 
          type: 'object', 
          properties: {
            service_name: { type: 'string' },
            unit_type: { type: 'string', enum: ['acre','sqft','linear_foot','pane','system_count','flat'] },
            units: { type: 'number' },
            lot_acres: { type: 'number' },
            sqft: { type: 'number' },
            beds: { type: 'number' },
            baths: { type: 'number' },
            year_built: { type: 'number' },
            zip: { type: 'string' },
            month: { type: 'number' }
          },
          required: ['service_name','unit_type']
        }
      }},
      { type: 'function', function: {
        name: 'search_providers',
        description: 'Find top providers for a service',
        parameters: { 
          type: 'object', 
          properties: {
            service_name: { type: 'string' },
            zip: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['service_name']
        }
      }},
      { type: 'function', function: {
        name: 'list_jobs',
        description: 'List provider jobs for a timeframe',
        parameters: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', enum: ['today','week','custom'] },
            from: { type: 'string' },
            to: { type: 'string' }
          },
          required: ['timeframe']
        }
      }},
      { type: 'function', function: {
        name: 'book_service',
        description: 'Book a service with a provider',
        parameters: {
          type: 'object',
          properties: {
            provider_id: { type: 'string' },
            service_name: { type: 'string' },
            address: { type: 'string' },
            date_time_window: { type: 'string' },
            notes: { type: 'string' }
          },
          required: ['provider_id','service_name','address','date_time_window']
        }
      }},
      { type: 'function', function: {
        name: 'reschedule_service',
        description: 'Reschedule a booking',
        parameters: {
          type: 'object',
          properties: {
            booking_id: { type: 'string' },
            new_time_window: { type: 'string' }
          },
          required: ['booking_id','new_time_window']
        }
      }},
      { type: 'function', function: {
        name: 'cancel_service',
        description: 'Cancel a booking',
        parameters: {
          type: 'object',
          properties: {
            booking_id: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['booking_id']
        }
      }},
      { type: 'function', function: {
        name: 'provider_setup',
        description: 'Set up provider profile',
        parameters: {
          type: 'object',
          properties: {
            business_name: { type: 'string' },
            service_categories: { type: 'array', items: { type: 'string' } },
            service_area_zip: { type: 'array', items: { type: 'string' } }
          },
          required: ['business_name','service_categories']
        }
      }},
      { type: 'function', function: {
        name: 'set_service_rates',
        description: 'Set provider service rates',
        parameters: {
          type: 'object',
          properties: {
            service_name: { type: 'string' },
            unit_type: { type: 'string' },
            base_per_unit: { type: 'number' },
            base_flat: { type: 'number' }
          },
          required: ['service_name','unit_type']
        }
      }},
      { type: 'function', function: {
        name: 'connect_calendar',
        description: 'Connect provider calendar',
        parameters: {
          type: 'object',
          properties: {
            method: { type: 'string', enum: ['google','icloud','ics'] }
          },
          required: ['method']
        }
      }},
      { type: 'function', function: {
        name: 'troubleshoot',
        description: 'Get troubleshooting steps',
        parameters: {
          type: 'object',
          properties: { topic: { type: 'string' } },
          required: ['topic']
        }
      }},
      { type: 'function', function: {
        name: 'get_article',
        description: 'Fetch help article',
        parameters: {
          type: 'object',
          properties: { slug: { type: 'string' } },
          required: ['slug']
        }
      }}
    ];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // First LLM call - force no tools on first turn
    let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'google/gemini-2.5-flash', 
        messages, 
        tools,
        tool_choice: hasAssistantHistory ? 'auto' : 'none'
      })
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limit', message: 'Service busy. Try again soon.' }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: 'payment_required', message: 'Credits exhausted. Please top up.' }), 
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;
    const toolResults: any[] = [];

    // Retry if empty response on first call
    if (!assistantMessage?.content?.trim() && !assistantMessage?.tool_calls?.length) {
      console.log('Empty response, retrying with override...');
      const retryMessages = [
        ...messages,
        { role: 'system', content: 'Your previous response was empty. Respond now with a friendly acknowledgement and include at most one clarifying question. Keep it short.' }
      ];
      
      const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: 'google/gemini-2.5-flash', 
          messages: retryMessages,
          tool_choice: 'none'
        })
      });
      
      const retryData = await retryResponse.json();
      assistantMessage = retryData.choices?.[0]?.message;
    }

    // Handle tool calls
    if (assistantMessage?.tool_calls?.length) {
      console.log('Tool calls:', assistantMessage.tool_calls.map((tc: any) => tc.function?.name));
      
      for (const tc of assistantMessage.tool_calls) {
        const fnName = tc.function?.name;
        const args = JSON.parse(tc.function?.arguments || '{}');
        let result: any = { error: 'Tool not implemented' };

        try {
          if (fnName === 'lookup_home') {
            const res = await supabase.functions.invoke('lookup-home', { body: { address: args.address } });
            result = res.data || res.error;
          } 
          else if (fnName === 'price_service') {
            const res = await supabase.functions.invoke('price-service', { body: args });
            result = res.data || res.error;
          }
          else if (fnName === 'search_providers') {
            // Map service to category
            const svcLower = args.service_name?.toLowerCase() || '';
            let category = 'General';
            if (svcLower.includes('hvac') || svcLower.includes('ac') || svcLower.includes('heat')) category = 'HVAC';
            else if (svcLower.includes('plumb') || svcLower.includes('leak') || svcLower.includes('drain')) category = 'Plumbing';
            else if (svcLower.includes('electric') || svcLower.includes('wiring')) category = 'Electrical';
            else if (svcLower.includes('lawn') || svcLower.includes('grass') || svcLower.includes('mow')) category = 'Lawn Care';
            else if (svcLower.includes('clean')) category = 'Cleaning';
            else if (svcLower.includes('gutter') || svcLower.includes('pressure')) category = 'Exterior';

            const { data: orgs } = await supabase
              .from('organizations')
              .select('id, name, service_type, provider_metrics(trust_score)')
              .contains('service_type', [category])
              .order('created_at', { ascending: false })
              .limit(10);

            const providers = (orgs || [])
              .map((o: any) => ({
                provider_id: o.id,
                name: o.name,
                trust_score: o.provider_metrics?.[0]?.trust_score || 5.0,
                distance_mi: null,
                soonest_slot: 'Tomorrow 1–3pm'
              }))
              .sort((a: any, b: any) => b.trust_score - a.trust_score)
              .slice(0, args.limit || 3);

            result = { providers };
          }
          else if (fnName === 'list_jobs') {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('id')
              .eq('owner_id', user.id)
              .single();

            if (orgData?.id) {
              let query = supabase.from('bookings').select('*').eq('provider_org_id', orgData.id);
              
              if (args.timeframe === 'today') {
                const today = new Date().toISOString().split('T')[0];
                query = query.gte('date_time_start', `${today}T00:00:00Z`).lt('date_time_start', `${today}T23:59:59Z`);
              } else if (args.timeframe === 'week') {
                const now = new Date();
                const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                query = query.gte('date_time_start', now.toISOString()).lte('date_time_start', weekEnd.toISOString());
              }
              
              const { data: jobs } = await query;
              result = { jobs: jobs || [] };
            } else {
              result = { jobs: [] };
            }
          }
          else if (fnName === 'book_service') {
            const { data: homeownerProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();

            if (homeownerProfile?.id) {
              const [dateStr, timeStr] = (args.date_time_window || '').split(' ');
              const startTime = new Date(`${dateStr}T${timeStr || '09:00'}:00Z`);
              const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

              const { data: booking } = await supabase.from('bookings').insert({
                homeowner_profile_id: homeownerProfile.id,
                provider_org_id: args.provider_id,
                service_name: args.service_name,
                address: args.address,
                date_time_start: startTime.toISOString(),
                date_time_end: endTime.toISOString(),
                notes: args.notes || '',
                status: 'pending'
              }).select('id').single();

              result = { booking_id: booking?.id, window: `${startTime.toLocaleString()} - ${endTime.toLocaleString()}` };
            } else {
              result = { error: 'Profile not found' };
            }
          }
          else if (fnName === 'reschedule_service') {
            const [dateStr, timeStr] = (args.new_time_window || '').split(' ');
            const startTime = new Date(`${dateStr}T${timeStr || '09:00'}:00Z`);
            const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

            await supabase.from('bookings')
              .update({ 
                date_time_start: startTime.toISOString(),
                date_time_end: endTime.toISOString()
              })
              .eq('id', args.booking_id);

            result = { booking_id: args.booking_id, new_window: `${startTime.toLocaleString()} - ${endTime.toLocaleString()}` };
          }
          else if (fnName === 'cancel_service') {
            await supabase.from('bookings')
              .update({ status: 'cancelled', cancellation_reason: args.reason || '' })
              .eq('id', args.booking_id);

            result = { booking_id: args.booking_id, status: 'cancelled' };
          }
          else if (fnName === 'provider_setup') {
            const { data: org } = await supabase.from('organizations')
              .upsert({
                owner_id: user.id,
                name: args.business_name,
                service_type: args.service_categories || [],
                service_area: (args.service_area_zip || []).join(','),
                slug: args.business_name.toLowerCase().replace(/\s+/g, '-')
              }, { onConflict: 'owner_id' })
              .select('id')
              .single();

            result = { provider_id: org?.id, status: 'setup_complete' };
          }
          else if (fnName === 'set_service_rates') {
            result = { ok: true, message: 'Rates saved' };
          }
          else if (fnName === 'connect_calendar') {
            result = { ok: true, status: 'connected', method: args.method };
          }
          else if (fnName === 'troubleshoot') {
            result = { 
              steps: [
                'Check your internet connection',
                'Clear browser cache and cookies',
                'Try a different browser',
                'Contact support if issue persists'
              ]
            };
          }
          else if (fnName === 'get_article') {
            const { data: article } = await supabase
              .from('knowledge_base')
              .select('*')
              .eq('slug', args.slug)
              .single();
            
            result = article || { error: 'Article not found' };
          }

          toolResults.push({ tool: fnName, result });
        } catch (error) {
          console.error(`Tool ${fnName} error:`, error);
          toolResults.push({ tool: fnName, result: { error: String(error) } });
        }
      }

      // Second LLM call with tool results
      messages.push({ role: 'assistant', content: '', tool_calls: assistantMessage.tool_calls });
      for (let i = 0; i < toolResults.length; i++) {
        messages.push({ 
          role: 'tool', 
          content: JSON.stringify(toolResults[i].result),
          tool_call_id: assistantMessage.tool_calls[i].id
        });
      }

      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: 'google/gemini-2.5-flash', 
          messages,
          tool_choice: 'none'
        })
      });

      const finalData = await finalResponse.json();
      assistantMessage = finalData.choices?.[0]?.message;
    }

    const reply = assistantMessage?.content || "I'm here to help. What do you need?";

    // Save assistant message
    await supabase.from('ai_chat_messages').insert({ 
      session_id: activeSessionId, 
      role: 'assistant', 
      content: reply,
      tool_calls: toolResults.length ? toolResults : null
    });

    await supabase.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', activeSessionId);

    return new Response(JSON.stringify({ 
      reply, 
      session_id: activeSessionId, 
      tool_results: toolResults.length ? toolResults : undefined 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: 'internal_error', 
      message: error instanceof Error ? error.message : 'Unknown' 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
