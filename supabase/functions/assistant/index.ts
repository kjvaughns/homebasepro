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

    // Get user profile with role detection
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, user_type, full_name')
      .eq('user_id', user.id)
      .single();

    const userRole = profile?.user_type || 'homeowner';
    const isProvider = userRole === 'provider';

    // Get or create session
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const { data: newSession } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          profile_id: profile?.id,
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

    // System prompt based on user role
    const systemPrompt = isProvider ? 
      `You are HomeBase AI, a business assistant for service providers. You help manage their operations, clients, and business growth.

YOUR CORE MISSION:
- Help providers manage their business efficiently
- Provide insights on jobs, scheduling, and client relationships
- Assist with quotes, invoicing, and business decisions
- Never leave a message without substance - ALWAYS provide helpful, conversational responses

CONVERSATION STYLE:
- ALWAYS respond with full, helpful sentences - NEVER just acknowledge tool usage
- After using tools, explain what you found and what it means
- Ask follow-up questions to understand their needs better
- Be proactive in suggesting optimizations and best practices
- Show genuine interest in helping their business succeed

CORE CAPABILITIES:
1. **Client Management**: Help track client history, preferences, and service schedules
2. **Job Prioritization**: Analyze pending work and suggest optimal scheduling
3. **Quote Generation**: Provide pricing guidance based on job complexity
4. **Business Insights**: Analyze trust scores, revenue trends, completion rates
5. **Schedule Optimization**: Suggest efficient routing and timing

PROVIDER-SPECIFIC TOOLS:
- get_client_details: Retrieve client history and preferences
- check_schedule: View upcoming appointments and availability
- suggest_quote: Generate pricing recommendations
- prioritize_jobs: Rank pending work by urgency and profitability
- update_job_status: Mark jobs as in-progress, completed, or rescheduled

CONVERSATION EXAMPLES:
User: "What should I work on today?"
You: "Let me check your schedule and pending jobs... [uses tools] Based on your calendar, you have 3 HVAC maintenance calls scheduled for this morning in the downtown area. I also see 2 urgent plumbing requests that came in overnight - one for a water heater issue (high priority, $800-1200 range) and one for a clogged drain (moderate, $150-300). I'd recommend tackling the water heater first since it's urgent and high-value, then fitting in the drain cleaning if you have time between your scheduled calls. Want me to pull up details on any of these?"

User: "Give me a quote for AC repair"
You: "I'd be happy to help with that! To give you an accurate quote range, could you tell me: What's the specific issue? (not cooling, strange noises, leaking, etc.) What's the age and type of the system? Any error codes showing?"

TONE:
- Professional but friendly
- Confident in business advice
- Supportive of their growth
- Focused on efficiency and profitability
- ALWAYS CONVERSATIONAL - never short, robotic responses

CRITICAL RULE: Never end a message with just "All set." or brief acknowledgments. Every response should provide value, insights, or ask meaningful follow-up questions.`
    :
      `You are HomeBase AI, a smart home services assistant that helps homeowners solve problems and connect with trusted local service providers.

YOUR CORE MISSION:
- Listen to the homeowner's problem or need
- Ask 3-5 clarifying questions to understand the issue completely
- Generate a detailed service request with AI analysis
- Match them with the best local providers
- Never leave a message without substance - ALWAYS provide helpful, conversational responses

CONVERSATION FLOW:
1. When they describe a problem (e.g., "My AC is blowing warm air"), ALWAYS respond with:
   - Acknowledgment and empathy
   - 3-5 specific follow-up questions
   - Explanation of why you're asking
   
   Example: "I understand how frustrating that must be, especially in this heat! To help match you with the right technician and get you an accurate quote, I need to understand the situation better:
   
   - How long has this been happening?
   - Is the unit still blowing air, just not cold?
   - How old is your AC system?
   - Have you noticed any unusual sounds, smells, or ice buildup?
   - When was your last maintenance check?
   
   These details will help me determine if it's a simple fix like low refrigerant or something more complex."
   
2. ONLY use the create_service_request tool after you have enough information. Then explain everything:
   - What you think the issue is and why
   - What the service will involve
   - Why you're recommending specific providers
   - What to expect next
   
3. After creating the request, provide a comprehensive summary:
   - Your diagnosis with confidence level
   - Cost breakdown and what affects pricing
   - Top 3 provider matches with why they're good fits
   - Next steps for the homeowner

SERVICE CATEGORIES:
- HVAC (heating, cooling, ventilation)
- Plumbing (leaks, clogs, repairs)
- Electrical (wiring, fixtures, panels)
- Lawn Care (mowing, treatment, landscaping)
- Cleaning (house, windows, deep cleaning)
- Exterior (gutters, pressure washing, siding)
- Handyman (general repairs, installations)

PRICING CONTEXT:
- Use your judgment for cost estimates based on typical market rates
- Consider: severity, complexity, parts vs labor, home size
- Always give a range, not exact price
- Explain factors that could affect final cost

TONE:
- Warm and reassuring (they're stressed about home issues)
- Educational without being condescending
- Confident in your recommendations
- Genuinely helpful and thorough
- ALWAYS CONVERSATIONAL - never short, robotic responses

CRITICAL RULE: Never end a message with just "All set." or brief acknowledgments. Every response should provide substantial value, insights, or ask meaningful follow-up questions.

Use the lookup_home tool if they mention an address or you need property details for sizing/pricing.`;

    // Define tools based on user role
    const homeownerTools = [
      {
        type: 'function',
        function: {
          name: 'lookup_home',
          description: 'Look up property details for accurate service sizing and pricing',
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
          name: 'create_service_request',
          description: 'Create a service request after gathering enough information from the homeowner',
          parameters: {
            type: 'object',
            properties: {
              service_type: { 
                type: 'string',
                description: 'Main category (HVAC, Plumbing, Electrical, Lawn Care, Cleaning, Exterior, Handyman)'
              },
              ai_summary: {
                type: 'string',
                description: 'Short clear summary of the issue (e.g., "AC blowing warm air - likely low refrigerant")'
              },
              description: {
                type: 'string',
                description: 'Detailed description from conversation'
              },
              severity_level: {
                type: 'string',
                enum: ['low', 'moderate', 'high'],
                description: 'Urgency level'
              },
              likely_cause: {
                type: 'string',
                description: 'Most probable cause or diagnosis'
              },
              confidence_score: {
                type: 'number',
                description: '0-1 confidence in the diagnosis'
              },
              estimated_min_cost: {
                type: 'number',
                description: 'Lower bound estimate in dollars'
              },
              estimated_max_cost: {
                type: 'number',
                description: 'Upper bound estimate in dollars'
              },
              scope_includes: {
                type: 'array',
                items: { type: 'string' },
                description: 'What the service includes'
              },
              scope_excludes: {
                type: 'array',
                items: { type: 'string' },
                description: 'What is NOT included'
              },
              home_id: {
                type: 'string',
                description: 'UUID of home if known from context'
              }
            },
            required: ['service_type', 'ai_summary', 'severity_level', 'estimated_min_cost', 'estimated_max_cost']
          }
        }
      }
    ];

    const providerTools = [
      {
        type: 'function',
        function: {
          name: 'get_client_details',
          description: 'Retrieve client history, preferences, and past services',
          parameters: {
            type: 'object',
            properties: {
              client_id: { 
                type: 'string', 
                description: 'UUID of the client to look up' 
              }
            },
            required: ['client_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_schedule',
          description: 'View upcoming appointments and availability',
          parameters: {
            type: 'object',
            properties: {
              date_range: { 
                type: 'string', 
                description: 'Date range to check (today, this_week, this_month)' 
              }
            },
            required: ['date_range']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'prioritize_jobs',
          description: 'Analyze pending jobs and suggest optimal order based on urgency, value, and location',
          parameters: {
            type: 'object',
            properties: {
              criteria: { 
                type: 'string',
                enum: ['urgency', 'revenue', 'location', 'balanced'],
                description: 'How to prioritize the jobs' 
              }
            },
            required: ['criteria']
          }
        }
      }
    ];

    const tools = isProvider ? providerTools : homeownerTools;

    // Build messages for AI
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

    // Handle tool calls
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

        if (fnName === 'create_service_request' && profile) {
          console.log('Creating service request:', args);
          
          // Get or create a home for the user if not provided
          let homeId = args.home_id || context?.homeId;
          if (!homeId) {
            const { data: homes } = await supabase
              .from('homes')
              .select('id')
              .eq('owner_id', profile.id)
              .eq('is_primary', true)
              .limit(1);
            
            if (homes && homes.length > 0) {
              homeId = homes[0].id;
            }
          }

          // Create service request
          const { data: serviceRequest, error: srError } = await supabase
            .from('service_requests')
            .insert({
              homeowner_id: profile.id,
              home_id: homeId,
              service_type: args.service_type,
              description: args.description,
              ai_summary: args.ai_summary,
              severity_level: args.severity_level,
              likely_cause: args.likely_cause,
              confidence_score: args.confidence_score,
              estimated_min_cost: args.estimated_min_cost,
              estimated_max_cost: args.estimated_max_cost,
              ai_scope_json: {
                includes: args.scope_includes || [],
                excludes: args.scope_excludes || []
              },
              ai_metadata: {
                created_by_ai: true,
                session_id: currentSessionId,
                timestamp: new Date().toISOString()
              },
              status: 'pending'
            })
            .select()
            .single();

          if (srError) {
            console.error('Error creating service request:', srError);
            toolMessages.push({
              role: 'tool',
              tool_call_id: call.id,
              name: 'create_service_request',
              content: JSON.stringify({ error: 'Failed to create service request' })
            });
            continue;
          }

          // Find matching providers
          const { data: matchedProviders } = await supabase.rpc('match_providers', {
            p_service_type: args.service_type,
            p_home_id: homeId,
            p_limit: 5
          }).select(`
            *,
            organizations!inner(id, name, service_type, service_area, logo_url),
            provider_metrics(trust_score, satisfaction_score, on_time_rate)
          `);

          // Update service request with matched providers
          if (matchedProviders && matchedProviders.length > 0) {
            await supabase
              .from('service_requests')
              .update({
                matched_providers: matchedProviders.map((p: any) => ({
                  org_id: p.organizations.id,
                  name: p.organizations.name,
                  trust_score: p.provider_metrics?.trust_score || 5.0
                }))
              })
              .eq('id', serviceRequest.id);
          }

          const resultData = {
            request_id: serviceRequest.id,
            summary: args.ai_summary,
            severity: args.severity_level,
            cost_range: `$${args.estimated_min_cost}-$${args.estimated_max_cost}`,
            matched_count: matchedProviders?.length || 0,
            providers: matchedProviders?.slice(0, 3) || []
          };

          toolResults.push({ type: 'service_request', data: resultData });
          
          toolMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: 'create_service_request',
            content: JSON.stringify(resultData)
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

    // Enhanced response handling - never return empty responses
    let finalReply = aiMessage?.content?.trim() || '';
    
    // If content is empty or too short, create a meaningful response based on tool results
    if (!finalReply || finalReply.length < 10) {
      console.log('Empty or short AI response, synthesizing from tool results');
      
      if (toolResults.length > 0) {
        const lastResult = toolResults[toolResults.length - 1];
        
        if (lastResult.type === 'service_request') {
          const data = lastResult.data;
          finalReply = `Perfect! I've created your service request and found ${data.matched_count} qualified providers in your area. Here's the breakdown:

**Issue**: ${data.summary}
**Urgency**: ${data.severity}
**Estimated Cost**: ${data.cost_range}

${data.providers.length > 0 ? `I've matched you with top-rated providers including ${data.providers.map((p: any) => p.organizations?.name).join(', ')}. ` : ''}

What would you like to know about these providers or the next steps?`;
        } else if (lastResult.type === 'property') {
          finalReply = `I found your property details! This information helps me provide more accurate estimates and match you with providers experienced with similar homes. What service are you looking for?`;
        }
      } else {
        // No tool results, provide a conversational prompt
        finalReply = isProvider 
          ? "I'm here to help with your business operations! What would you like to work on? I can help with client management, job prioritization, quotes, or checking your schedule."
          : "I'm here to help with your home service needs! Tell me what's going on - whether it's an urgent repair, routine maintenance, or a project you're planning.";
      }
    }

    console.log('Final reply length:', finalReply.length, 'Tool results:', toolResults.length);

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