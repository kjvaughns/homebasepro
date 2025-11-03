import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { handleCorsPrefilight, successResponse, errorResponse } from '../_shared/http.ts';

const INTERCOM_ACCESS_TOKEN = Deno.env.get('INTERCOM_ACCESS_TOKEN');
const INTERCOM_WEBHOOK_SECRET = Deno.env.get('INTERCOM_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ESCALATION_KEYWORDS = [
  'billing', 'payment failed', 'can\'t login', 'cannot login', 'data loss', 
  'account locked', 'security', 'hacked', 'refund', 'charge', 'subscription cancel'
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

Deno.serve(async (req) => {
  const corsResponse = handleCorsPrefilight(req);
  if (corsResponse) return corsResponse;

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

  // Check for escalation keywords
  const hasUrgentKeyword = ESCALATION_KEYWORDS.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );

  if (hasUrgentKeyword) {
    console.log('Urgent keyword detected, escalating to human');
    await assignToTeam(conversationId, 'urgent_issue');
    return successResponse({ message: 'Escalated to human support' });
  }

  // Get user context from Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const userRole = user.custom_attributes?.role || 'homeowner';

  // Call appropriate AI assistant
  const assistantFunction = userRole === 'provider' ? 'assistant-provider' : 'assistant';
  
  try {
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke(assistantFunction, {
      body: {
        messages: [{ role: 'user', content: userMessage }],
        user_id: user.id,
        context: {
          email: user.email,
          name: user.name,
          role: userRole,
          plan: user.custom_attributes?.subscription_plan || 'free'
        }
      }
    });

    if (aiError) {
      console.error('AI assistant error:', aiError);
      await assignToTeam(conversationId, 'ai_error');
      return errorResponse('AI_ERROR', aiError.message, 500);
    }

    const reply = aiResponse?.reply || aiResponse?.message || 'I apologize, but I need a moment to process that. Let me connect you with our team.';
    const confidence = aiResponse?.confidence || 0.5;

    console.log('AI response confidence:', confidence);

    // Check confidence threshold
    if (confidence < 0.75) {
      console.log('Low confidence, escalating to human');
      await assignToTeam(conversationId, 'low_confidence');
      return successResponse({ message: 'Low confidence, escalated' });
    }

    // Post AI reply to Intercom
    await postReply(conversationId, reply);

    return successResponse({ 
      message: 'AI response posted',
      confidence,
      reply: reply.substring(0, 100)
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
