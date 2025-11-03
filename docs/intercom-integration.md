# Intercom Integration Guide

## Overview
HomeBase AI is integrated with Intercom Messenger to provide conversational support for both homeowners and providers. The integration connects Intercom as the UI layer while keeping all business logic in HomeBase edge functions.

## Architecture

```
┌─────────────────┐
│ Intercom        │
│ Messenger       │ (UI Layer)
└────────┬────────┘
         │
         │ Webhook Events
         ▼
┌─────────────────┐
│ intercom-webhook│
│ Edge Function   │ (Router)
└────────┬────────┘
         │
         │ Routes to
         ▼
┌─────────────────┬─────────────────┐
│ assistant       │ assistant-      │
│ (Homeowners)    │ provider        │
└─────────────────┴─────────────────┘
         │
         │ Uses existing tools
         ▼
┌────────────────────────────────────┐
│ HomeBase Edge Functions & DB      │
│ (Business Logic)                   │
└────────────────────────────────────┘
```

## Webhook Events

The `intercom-webhook` edge function handles these events:

### 1. conversation.user.created
Triggered when a user starts a new conversation.

### 2. conversation.user.replied
Triggered when a user sends a follow-up message in an existing conversation.

### 3. Custom Actions (Button Clicks)
Handled via `/intercom-webhook/action` endpoint.

## Configuration

### Required Secrets
Set these in Supabase Edge Functions:
- `INTERCOM_ACCESS_TOKEN` - From Developer Hub → Authentication
- `INTERCOM_WEBHOOK_SECRET` - From Developer Hub → Webhooks (after saving)
- `INTERCOM_IDENTITY_VERIFICATION_SECRET` - For secure user identification

### Webhook Setup
1. Go to Intercom Developer Hub → Your App → Webhooks
2. Add webhook URL: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/intercom-webhook`
3. Subscribe to topics:
   - `conversation.user.created`
   - `conversation.user.replied`
4. Save and copy the signing secret
5. Add secret to Supabase: `INTERCOM_WEBHOOK_SECRET`

## Conversation Memory

Conversations are linked to HomeBase AI sessions via the `intercom_sessions` table:

```typescript
interface IntercomSession {
  id: UUID;
  conversation_id: string; // Intercom conversation ID
  session_id: UUID;        // Links to ai_chat_sessions
  user_id: UUID;
  user_role: 'homeowner' | 'provider';
  created_at: timestamp;
  last_activity_at: timestamp;
  context: JSONB;          // Stored user context
}
```

This allows:
- Persistent context across messages
- Conversation history retrieval
- User-specific personalization
- Session analytics

## AI Escalation Logic

The webhook intelligently decides when to escalate to human support:

### Automatic Escalation (Immediate)
- User explicitly requests: "talk to human", "speak to agent", "representative"
- Urgent keywords detected: "billing", "can't login", "hacked", "emergency", "broken"

### Confidence-Based Escalation
- AI confidence < 50% → Offers "Talk to a Human" button
- AI confidence 50-70% + complex query → Adds escalation button to response
- AI confidence > 70% → Pure AI response

### Escalation Reasons Tracked
- `user_requested` - Explicit human request
- `urgent_issue` - Critical keyword detected
- `low_confidence` - AI not confident in response
- `ai_error` - Technical error calling AI
- `processing_error` - System error

## Rich Message Formatting

The webhook converts tool results into Intercom-friendly formats:

### Provider Search Results
```
**Top Providers:**
1. **FlowRight Plumbing** - ⭐ 8.5 trust score
2. **ProFix HVAC** - ⭐ 8.2 trust score
3. **HomeCare Services** - ⭐ 7.9 trust score

[Book FlowRight Plumbing] [Book ProFix HVAC] [Book HomeCare Services]
```

### Price Estimates
```
💰 **Price Estimate:** $110-$240 (72% confidence)

Based on:
- Service: Refrigerator repair
- Location: 78704
- Typical range for appliance diagnostics
```

### Job Lists
```
**Your Jobs:**
1. HVAC Maintenance - scheduled (Smith Residence)
2. Leak Repair - in_progress (Jones Property)
3. Gutter Cleaning - quoted (Davis Home)
```

### Quotes
```
📋 **Quote Generated:** $425.00

Line items:
- Service call: $95
- Parts: $230
- Labor (2.5h): $100

[Send to Client]
```

## Custom Actions (Buttons)

Register these in Intercom Developer Hub → Customize:

### homebase.providers.search
**Purpose:** Find providers matching service needs
**Input:**
```json
{
  "service_name": "string",
  "zip": "string",
  "limit": 3
}
```
**Returns:** List of providers with trust scores, availability

### homebase.service.book
**Purpose:** Create a booking with a provider
**Input:**
```json
{
  "provider_id": "uuid",
  "service_name": "string",
  "address": "string",
  "date_time_window": "ISO timestamp",
  "notes": "string"
}
```
**Returns:** Booking confirmation

### homebase.quote.create
**Purpose:** Generate a quote for a job
**Input:**
```json
{
  "service_id": "uuid",
  "client_id": "uuid",
  "parts_ids": ["uuid"],
  "custom_notes": "string"
}
```
**Returns:** Quote with line items and total

### homebase.invoice.create
**Purpose:** Create invoice from completed job
**Input:**
```json
{
  "service_call_id": "uuid",
  "amount": 42500,
  "due_days": 30
}
```
**Returns:** Invoice URL and payment link

### homebase.jobs.list
**Purpose:** List jobs with filters
**Input:**
```json
{
  "timeframe": "today|week|month",
  "status": ["scheduled", "in_progress"],
  "client_id": "uuid"
}
```
**Returns:** Filtered job list

## Identity Verification

For secure user identification, use the `generate-intercom-hash` edge function:

```typescript
// Frontend - Get hash before initializing Intercom
const { data } = await supabase.functions.invoke('generate-intercom-hash');

window.intercomSettings = {
  app_id: "YOUR_APP_ID",
  user_id: user.id,
  email: user.email,
  name: user.name,
  user_hash: data.hash, // HMAC-SHA256 of user_id
  role: "provider", // or "homeowner"
  plan: "pro"
};
```

## Testing

### Test Homeowner Flow
1. Open Intercom in app as homeowner
2. Type: "My fridge is leaking"
3. Expect: Price estimate + provider cards
4. Click: "Book [Provider Name]"
5. Verify: Booking created in DB

### Test Provider Flow
1. Open Intercom as provider
2. Type: "Show today's jobs"
3. Expect: List of jobs with status
4. Type: "Create quote for [client]"
5. Verify: Quote generated and saved

### Test Escalation
1. Type: "I can't login"
2. Expect: Immediate human assignment
3. Type: "How do I export clients?"
4. Expect: AI guidance + "Talk to human" button if confidence low

### Test Custom Actions
1. Search providers → Click "Book Now"
2. Verify: POST to `/intercom-webhook/action`
3. Verify: Booking created
4. Verify: Confirmation in chat

## Monitoring

### Key Metrics to Track
- **Escalation rate**: % of conversations assigned to humans
- **Resolution rate**: % solved by AI without escalation
- **Tool usage**: Which tools are called most often
- **Confidence distribution**: Average AI confidence scores
- **Response time**: Time from user message to AI reply

### Logs to Review
```sql
-- Check recent Intercom sessions
SELECT * FROM intercom_sessions 
ORDER BY last_activity_at DESC 
LIMIT 20;

-- Check escalation reasons
SELECT context->>'escalation_reason' as reason, COUNT(*) 
FROM intercom_sessions 
WHERE context->>'escalated' = 'true'
GROUP BY reason;

-- Check AI session performance
SELECT 
  s.user_role,
  AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))) as avg_duration_sec,
  COUNT(m.id) as message_count
FROM ai_chat_sessions s
JOIN ai_chat_messages m ON m.session_id = s.id
WHERE s.created_at > NOW() - INTERVAL '7 days'
GROUP BY s.user_role;
```

### Edge Function Logs
```bash
# View webhook logs
supabase functions logs intercom-webhook

# Search for errors
supabase functions logs intercom-webhook --filter "level=error"

# Search for escalations
supabase functions logs intercom-webhook --filter "escalation"
```

## Troubleshooting

### Issue: Webhook not receiving events
**Check:**
1. Webhook URL correct in Intercom settings
2. `INTERCOM_WEBHOOK_SECRET` matches Developer Hub
3. Edge function logs for signature verification errors

### Issue: AI not responding
**Check:**
1. `assistant` and `assistant-provider` functions deployed
2. `LOVABLE_API_KEY` configured correctly
3. Edge function logs for AI gateway errors

### Issue: Buttons not working
**Check:**
1. Custom Action URLs point to correct edge function
2. `/intercom-webhook/action` endpoint handling POST
3. Payload format matches expected schema

### Issue: Memory not persisting
**Check:**
1. `intercom_sessions` table created via migration
2. `ai_chat_sessions` and `ai_chat_messages` tables exist
3. RLS policies allow service role access

### Issue: Too many escalations
**Tune:**
1. Lower confidence threshold (currently 50%)
2. Add more training examples to assistant prompts
3. Improve tool descriptions for better routing
4. Review escalation reasons to find patterns

## Next Steps

### Post-Launch Improvements
1. **Proactive messages**: "Your AC checkup is due!"
2. **A/B test prompts**: Test different AI personalities
3. **Analytics dashboard**: Build Intercom metrics in admin
4. **More Custom Actions**: Add payment, scheduling, reviews
5. **Multi-language support**: Detect user language and respond accordingly

### Advanced Features
- **Voice messages**: Transcribe and process audio
- **Image analysis**: Use AI to analyze uploaded photos
- **Sentiment tracking**: Monitor customer satisfaction
- **Auto-tagging**: Classify conversations by topic
- **Smart routing**: Route to specialist teams based on issue type

## Support

For questions or issues:
- Internal: Check edge function logs and DB queries above
- Intercom: Developer Hub → Support
- HomeBase: Contact engineering team

---

**Last Updated:** 2025-11-03  
**Version:** 1.0  
**Maintained by:** HomeBase Engineering
