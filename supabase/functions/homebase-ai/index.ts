import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { searchKnowledge, getQuickReply, trackConversation, buildKnowledgeContext } from "./knowledge.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      sessionId, 
      userId, 
      userRole,
      conversationHistory,
      context 
    } = await req.json();

    console.log('HomeBase AI request:', { sessionId, userRole, messageLength: message?.length });

    // Check for quick reply first (instant responses)
    const quickReply = await getQuickReply(message);
    if (quickReply) {
      console.log('Using quick reply:', quickReply.id);
      return new Response(
        JSON.stringify({
          response: quickReply.response_text,
          toolResults: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search knowledge base for relevant articles
    const knowledgeArticles = await searchKnowledge(message, 3);
    console.log(`Found ${knowledgeArticles.length} knowledge articles`);

    // Build context with knowledge
    const knowledgeContext = buildKnowledgeContext(knowledgeArticles);

    // Get Lovable AI key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system prompt based on user role
    const systemPrompt = userRole === 'provider' 
      ? `You are HomeBase AI, an intelligent assistant helping service providers manage their business.

## Your Capabilities:
- Help with scheduling, bookings, and calendar management
- Generate invoices and quotes
- Track earnings and payments
- Manage client communications
- Provide business insights and analytics
- Answer questions about HomeBase features

## Communication Style:
- Professional yet friendly
- Action-oriented and efficient
- Provide clear, concise responses
- Offer to help with specific tasks
- Use tools to accomplish tasks when needed

${knowledgeContext}

## Important Guidelines:
- Always be proactive in offering to help with tasks
- If you need more information to complete a task, ask specific questions
- Confirm actions before executing them
- Provide clear confirmation after completing tasks`
      : `You are HomeBase AI, a helpful assistant for homeowners finding and booking home services.

## Your Capabilities:
- Help find and book trusted service providers
- Provide instant price estimates
- Answer questions about services
- Guide through the booking process
- Track service requests and bookings
- Handle rescheduling and cancellations

## Communication Style:
- Warm and approachable
- Patient and helpful
- Clear and transparent about pricing
- Proactive in anticipating needs
- Quick to provide solutions

${knowledgeContext}

## Important Guidelines:
- Always prioritize homeowner satisfaction and safety
- Be transparent about pricing and provider details
- Offer alternatives when the first option doesn't work
- Guide users step-by-step through processes
- Ask clarifying questions when needed`;

    // Define tools based on user role
    const tools = userRole === 'provider' ? [
      {
        type: "function",
        function: {
          name: "get_schedule",
          description: "Get the provider's schedule and upcoming bookings",
          parameters: {
            type: "object",
            properties: {
              timeframe: {
                type: "string",
                enum: ["today", "week", "month"],
                description: "The timeframe to retrieve schedule for"
              }
            },
            required: ["timeframe"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_invoice",
          description: "Create an invoice for a client",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Client name" },
              amount: { type: "number", description: "Invoice amount in dollars" },
              description: { type: "string", description: "Service description" }
            },
            required: ["client_name", "amount", "description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_earnings",
          description: "Get earnings summary and payment status",
          parameters: {
            type: "object",
            properties: {
              period: {
                type: "string",
                enum: ["week", "month", "year"],
                description: "Period to calculate earnings for"
              }
            },
            required: ["period"]
          }
        }
      }
    ] : [
      {
        type: "function",
        function: {
          name: "create_service_request",
          description: "Create a new service request with estimated pricing",
          parameters: {
            type: "object",
            properties: {
              service_type: { type: "string", description: "Type of service needed" },
              description: { type: "string", description: "Detailed description of the issue or service needed" },
              urgency: { 
                type: "string",
                enum: ["low", "medium", "high", "emergency"],
                description: "How urgent is this service"
              },
              location: { type: "string", description: "Service location or address" }
            },
            required: ["service_type", "description", "urgency"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "find_providers",
          description: "Find available service providers based on service type and location",
          parameters: {
            type: "object",
            properties: {
              service_type: { type: "string", description: "Type of service needed" },
              location: { type: "string", description: "Service location" }
            },
            required: ["service_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_price_estimate",
          description: "Get estimated price range for a service",
          parameters: {
            type: "object",
            properties: {
              service_type: { type: "string", description: "Type of service" },
              details: { type: "string", description: "Additional service details" }
            },
            required: ["service_type"]
          }
        }
      }
    ];

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    // Call Lovable AI
    const startTime = Date.now();
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    const aiMessage = data.choices[0]?.message;
    const toolCalls = aiMessage?.tool_calls || [];

    console.log('AI response:', { 
      contentLength: aiMessage?.content?.length, 
      toolCallsCount: toolCalls.length,
      responseTime 
    });

    // Track conversation analytics
    if (sessionId) {
      const toolsUsed = toolCalls.map((tc: any) => tc.function.name);
      const knowledgeIds = knowledgeArticles.map((a: any) => a.id);
      
      await trackConversation({
        session_id: sessionId,
        user_id: userId,
        user_role: userRole,
        message_count: (conversationHistory?.length || 0) + 2,
        tools_used: toolsUsed,
        knowledge_articles_used: knowledgeIds,
        average_response_time_ms: responseTime,
        resolved: false
      });
    }

    // Process tool calls if any
    const toolResults: any[] = [];
    
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log('Tool call:', functionName, args);

      // Add tool results (these are handled client-side in the actual implementation)
      toolResults.push({
        tool: functionName,
        arguments: args
      });
    }

    return new Response(
      JSON.stringify({
        response: aiMessage?.content || '',
        toolResults,
        knowledgeUsed: knowledgeArticles.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('HomeBase AI error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our support team if the issue persists."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});