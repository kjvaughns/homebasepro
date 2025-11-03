import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { handleCorsPrefilight, successResponse, errorResponse } from '../_shared/http.ts';

const INTERCOM_ACCESS_TOKEN = Deno.env.get('INTERCOM_ACCESS_TOKEN');
const INTERCOM_WEBHOOK_SECRET = Deno.env.get('INTERCOM_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ESCALATION_KEYWORDS = [
  'billing', 'payment failed', 'can\'t login', 'cannot login', 'data loss', 
  'account locked', 'security', 'hacked', 'refund', 'charge', 'subscription cancel',
  'urgent', 'emergency', 'broken', 'not working', 'help now'
];

interface IntercomWebhookEvent {
  type: string;
  data: {
    item: {
      type: string;
      id: string;
      user?: {
        id: string;
        email?: string;
        name?: string;
        custom_attributes?: Record<string, any>;
      };
      conversation_parts?: {
        conversation_parts: Array<{
          body: string;
          part_type: string;
          author: {
            type: string;
            id: string;
          };
        }>;
      };
      source?: {
        body?: string;
      };
    };
  };
}

interface ToolResult {
  type: string;
  data: any;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPrefilight(req);
  if (corsResponse) return corsResponse;

  // Handle Custom Action callbacks (button clicks)
  const url = new URL(req.url);
  if (url.pathname.endsWith('/action')) {
    return handleCustomAction(req);
  }

  try {
    if (!INTERCOM_ACCESS_TOKEN) {
      console.error('INTERCOM_ACCESS_TOKEN not configured');
      return errorResponse('CONFIG_ERROR', 'Intercom access token not configured', 500);
    }

    // Verify webhook signature if secret is configured
    if (INTERCOM_WEBHOOK_SECRET) {
      const signature = req.headers.get('X-Hub-Signature');
      const body = await req.text();
      
      if (signature) {
        const expectedSignature = 'sha256=' + createHmac('sha256', INTERCOM_WEBHOOK_SECRET)
          .update(body)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.error('Invalid webhook signature');
          return errorResponse('INVALID_SIGNATURE', 'Invalid webhook signature', 401);
        }
      }
      
      const event: IntercomWebhookEvent = JSON.parse(body);
      return await processWebhook(event);
    } else {
      const event: IntercomWebhookEvent = await req.json();
      return await processWebhook(event);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('WEBHOOK_ERROR', message, 500);
  }
});

async function processWebhook(event: IntercomWebhookEvent) {
  console.log('Processing webhook:', event.type);

  // Only process user messages
  if (event.type !== 'conversation.user.created' && event.type !== 'conversation.user.replied') {
    return successResponse({ message: 'Event type not handled' });
  }

  const conversation = event.data.item;
  if (conversation.type !== 'conversation') {
    return successResponse({ message: 'Not a conversation' });
  }

  const conversationId = conversation.id;
  const user = conversation.user;

  if (!user?.id) {
    console.error('No user in conversation');
    return errorResponse('NO_USER', 'No user found in conversation', 400);
  }

  // Extract user message
  let userMessage = '';
  if (event.type === 'conversation.user.created') {
    userMessage = conversation.source?.body || '';
  } else {
    const parts = conversation.conversation_parts?.conversation_parts || [];
    const lastUserMessage = parts.reverse().find(p => p.author.type === 'user');
    userMessage = lastUserMessage?.body || '';
  }

  if (!userMessage) {
    return successResponse({ message: 'No message to process' });
  }

  // Strip HTML tags from message
  userMessage = userMessage.replace(/<[^>]*>/g, '').trim();

  console.log('User message:', userMessage);

  // Check for explicit escalation requests
  const wantsHuman = /\b(talk to|speak to|human|agent|representative|person)\b/i.test(userMessage);
  const hasUrgentKeyword = ESCALATION_KEYWORDS.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );

  if (wantsHuman || hasUrgentKeyword) {
    console.log('User requested human or urgent keyword detected');
    await assignToTeam(conversationId, wantsHuman ? 'user_requested' : 'urgent_issue');
    return successResponse({ message: 'Escalated to human support' });
  }

  // Get or create session for conversation context
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const userRole = user.custom_attributes?.role || 'homeowner';

  // Get or create Intercom session
  const { data: existingSession } = await supabase
    .from('intercom_sessions')
    .select('*')
    .eq('conversation_id', conversationId)
    .single();

  let sessionId = existingSession?.session_id;
  let aiSessionId = existingSession?.session_id;

  if (!existingSession) {
    // Create new AI chat session
    const { data: newAiSession } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: user.id,
        context: {
          email: user.email,
          name: user.name,
          role: userRole,
          plan: user.custom_attributes?.subscription_plan || 'free',
          source: 'intercom'
        }
      })
      .select('id')
      .single();

    aiSessionId = newAiSession?.id;

    // Link Intercom conversation to AI session
    await supabase
      .from('intercom_sessions')
      .insert({
        conversation_id: conversationId,
        session_id: aiSessionId,
        user_id: user.id,
        user_role: userRole,
        context: {
          email: user.email,
          name: user.name,
          plan: user.custom_attributes?.subscription_plan || 'free'
        }
      });
  } else {
    // Update last activity
    await supabase
      .from('intercom_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('conversation_id', conversationId);
  }

  // Get conversation history
  const { data: history } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('session_id', aiSessionId)
    .order('created_at', { ascending: true });

  // Call appropriate AI assistant
  const assistantFunction = userRole === 'provider' ? 'assistant-provider' : 'assistant';
  
  try {
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke(assistantFunction, {
      body: {
        session_id: aiSessionId,
        message: userMessage,
        history: history || [],
        context: {
          email: user.email,
          name: user.name,
          role: userRole,
          plan: user.custom_attributes?.subscription_plan || 'free',
          source: 'intercom'
        }
      }
    });

    if (aiError) {
      console.error('AI assistant error:', aiError);
      await assignToTeam(conversationId, 'ai_error');
      return errorResponse('AI_ERROR', aiError.message, 500);
    }

    const reply = aiResponse?.reply || aiResponse?.message || 'Let me connect you with our team for help.';
    const toolResults: ToolResult[] = aiResponse?.tool_results || [];
    const confidence = aiResponse?.confidence || 0.6;

    console.log('AI response:', { confidence, toolResultsCount: toolResults.length });

    // Lower confidence threshold to 50% (was 75%)
    if (confidence < 0.5) {
      console.log('Low confidence (<50%), offering human escalation');
      await postReplyWithEscalationButton(conversationId, reply);
      return successResponse({ message: 'Low confidence, offered escalation' });
    }

    // Format and post reply based on tool results
    if (toolResults.length > 0) {
      await postRichReply(conversationId, reply, toolResults);
    } else {
      // Add "Talk to human" button for complex queries
      if (userMessage.length > 200 || confidence < 0.7) {
        await postReplyWithEscalationButton(conversationId, reply);
      } else {
        await postReply(conversationId, reply);
      }
    }

    return successResponse({ 
      message: 'AI response posted',
      confidence,
      toolResultsCount: toolResults.length
    });

  } catch (error) {
    console.error('Error processing AI response:', error);
    await assignToTeam(conversationId, 'processing_error');
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('PROCESSING_ERROR', message, 500);
  }
}

async function postReply(conversationId: string, message: string) {
  const response = await fetch(`https://api.intercom.io/conversations/${conversationId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11'
    },
    body: JSON.stringify({
      message_type: 'comment',
      type: 'admin',
      body: message
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to post reply:', error);
    throw new Error(`Failed to post reply: ${response.status}`);
  }

  return response.json();
}

async function postReplyWithEscalationButton(conversationId: string, message: string) {
  const response = await fetch(`https://api.intercom.io/conversations/${conversationId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11'
    },
    body: JSON.stringify({
      message_type: 'comment',
      type: 'admin',
      body: `${message}\n\n---\n\nNeed more help? I can connect you with a team member.`,
      blocks: [
        {
          type: "button",
          text: "Talk to a Human",
          style: "primary",
          action: {
            type: "submit",
            url: `${SUPABASE_URL}/functions/v1/intercom-webhook/action`,
            payload: JSON.stringify({
              action: 'escalate',
              conversation_id: conversationId
            })
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to post reply with button:', error);
    throw new Error(`Failed to post reply: ${response.status}`);
  }

  return response.json();
}

async function postRichReply(conversationId: string, message: string, toolResults: ToolResult[]) {
  // Check what kind of results we have
  const hasProviders = toolResults.some(r => r.type === 'search_providers');
  const hasPricing = toolResults.some(r => r.type === 'price_service');
  const hasJobs = toolResults.some(r => r.type === 'list_jobs');
  const hasQuote = toolResults.some(r => r.type === 'generate_job_quote');

  let formattedBody = message;
  const blocks: any[] = [];

  // Format provider results as cards
  if (hasProviders) {
    const providerResult = toolResults.find(r => r.type === 'search_providers');
    const providers = providerResult?.data?.providers || [];
    
    if (providers.length > 0) {
      formattedBody += '\n\n**Top Providers:**';
      providers.slice(0, 3).forEach((provider: any, idx: number) => {
        const org = provider.organizations || {};
        formattedBody += `\n${idx + 1}. **${org.name || 'Provider'}** - ⭐ ${provider.trust_score || '5.0'} trust score`;
      });

      // Add book buttons
      providers.slice(0, 3).forEach((provider: any) => {
        blocks.push({
          type: "button",
          text: `Book ${provider.organizations?.name || 'Provider'}`,
          style: "primary",
          action: {
            type: "url",
            url: `https://homebaseproapp.com/provider/${provider.organizations?.slug}`
          }
        });
      });
    }
  }

  // Format pricing results
  if (hasPricing) {
    const priceResult = toolResults.find(r => r.type === 'price_service');
    const priceData = priceResult?.data;
    
    if (priceData) {
      formattedBody += `\n\n💰 **Price Estimate:** $${priceData.low}-${priceData.high}`;
      if (priceData.confidence) {
        formattedBody += ` (${Math.round(priceData.confidence * 100)}% confidence)`;
      }
    }
  }

  // Format job lists
  if (hasJobs) {
    const jobResult = toolResults.find(r => r.type === 'list_jobs');
    const jobs = jobResult?.data?.jobs || [];
    
    if (jobs.length > 0) {
      formattedBody += '\n\n**Your Jobs:**';
      jobs.slice(0, 5).forEach((job: any, idx: number) => {
        formattedBody += `\n${idx + 1}. ${job.service_name} - ${job.status}`;
        if (job.clients?.name) formattedBody += ` (${job.clients.name})`;
      });
    }
  }

  // Format quotes
  if (hasQuote) {
    const quoteResult = toolResults.find(r => r.type === 'generate_job_quote');
    const quoteData = quoteResult?.data;
    
    if (quoteData) {
      formattedBody += `\n\n📋 **Quote Generated:** $${(quoteData.total_amount / 100).toFixed(2)}`;
    }
  }

  await fetch(`https://api.intercom.io/conversations/${conversationId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11'
    },
    body: JSON.stringify({
      message_type: 'comment',
      type: 'admin',
      body: formattedBody,
      blocks: blocks.length > 0 ? blocks : undefined
    })
  });
}

async function assignToTeam(conversationId: string, reason: string) {
  console.log(`Assigning conversation ${conversationId} to team. Reason: ${reason}`);

  // Tag conversation
  await fetch(`https://api.intercom.io/conversations/${conversationId}/tags`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11'
    },
    body: JSON.stringify({
      id: conversationId,
      admin_assignee_id: null // Assign to unassigned queue
    })
  });

  // Post internal note about escalation
  await fetch(`https://api.intercom.io/conversations/${conversationId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11'
    },
    body: JSON.stringify({
      message_type: 'note',
      type: 'admin',
      body: `⚠️ Escalated to human support. Reason: ${reason}`
    })
  });
}

async function handleCustomAction(req: Request) {
  try {
    const body = await req.json();
    const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body.payload;
    
    if (payload.action === 'escalate') {
      await assignToTeam(payload.conversation_id, 'user_clicked_button');
      return successResponse({ message: 'Escalated to team' });
    }

    return successResponse({ message: 'Action handled' });
  } catch (error) {
    console.error('Custom action error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('ACTION_ERROR', message, 500);
  }
}
