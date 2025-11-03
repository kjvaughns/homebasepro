# Intercom + HomeBase AI - Quick Start

## What This Does

Intercom Messenger is now the **primary conversational UI** for HomeBase AI. Users chat in Intercom → AI responds using existing HomeBase tools → all actions happen in the platform.

## Key Features

✅ **Smart Routing**: Homeowners get `assistant`, Providers get `assistant-provider`  
✅ **Conversation Memory**: Sessions persist across messages via `intercom_sessions` table  
✅ **Rich Responses**: Provider cards, price estimates, job lists with action buttons  
✅ **Intelligent Escalation**: 50% confidence threshold with "Talk to Human" buttons  
✅ **Custom Actions**: Button clicks route to existing edge functions  
✅ **Secure**: Webhook signature verification + identity verification

## Architecture

```
User → Intercom UI → intercom-webhook → assistant/assistant-provider → HomeBase Tools → Database
```

## Setup Checklist

### 1. Secrets Configured ✓
- [x] `INTERCOM_ACCESS_TOKEN`
- [x] `INTERCOM_WEBHOOK_SECRET`
- [x] `INTERCOM_IDENTITY_VERIFICATION_SECRET`

### 2. Webhook Registered in Intercom
- **URL**: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/intercom-webhook`
- **Events**: `conversation.user.created`, `conversation.user.replied`

### 3. Database Schema ✓
- [x] `intercom_sessions` table created
- [x] Indexes on `conversation_id`, `user_id`, `session_id`
- [x] RLS policies for service role and user access

### 4. Edge Functions ✓
- [x] `intercom-webhook` - Main router
- [x] `assistant` - Homeowner AI
- [x] `assistant-provider` - Provider AI
- [x] `generate-intercom-hash` - Identity verification

## Register Custom Actions in Intercom

Go to **Developer Hub → Your App → Customize → Add Custom Action**:

### 1. Search Providers
- **Action Name**: `homebase.providers.search`
- **URL**: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/assistant`
- **Method**: POST
- **Input**: `{ service_name, zip, limit }`

### 2. Book Service
- **Action Name**: `homebase.service.book`
- **URL**: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/assistant`
- **Method**: POST
- **Input**: `{ provider_id, service_name, address, date_time_window, notes }`

### 3. Create Quote (Provider)
- **Action Name**: `homebase.quote.create`
- **URL**: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/assistant-provider`
- **Method**: POST
- **Input**: `{ service_id, client_id, parts_ids, custom_notes }`

### 4. List Jobs (Provider)
- **Action Name**: `homebase.jobs.list`
- **URL**: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/assistant-provider`
- **Method**: POST
- **Input**: `{ timeframe, status, client_id }`

### 5. Create Invoice (Provider)
- **Action Name**: `homebase.invoice.create`
- **URL**: `https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/assistant-provider`
- **Method**: POST
- **Input**: `{ service_call_id, booking_id, amount, due_days }`

## Testing

### Quick Smoke Test
1. **Homeowner**: "My AC isn't cooling" → Expect price estimate + providers
2. **Provider**: "Show today's jobs" → Expect job list
3. **Escalation**: "I can't login" → Expect immediate human assignment
4. **Low confidence**: Ask obscure question → Expect "Talk to Human" button

### Verify Logs
```bash
# Check webhook is receiving events
supabase functions logs intercom-webhook --tail

# Check AI is being called
supabase functions logs assistant --tail

# Check session persistence
SELECT * FROM intercom_sessions ORDER BY last_activity_at DESC LIMIT 5;
```

## How It Works

### Message Flow
1. User sends message in Intercom
2. Webhook receives `conversation.user.created` or `conversation.user.replied`
3. Webhook strips HTML, checks for escalation keywords
4. Gets/creates `intercom_session` linked to `ai_chat_session`
5. Calls appropriate assistant (`assistant` or `assistant-provider`)
6. Assistant uses tools (search_providers, price_service, list_jobs, etc.)
7. Webhook formats tool results into rich Intercom messages
8. Posts reply with buttons/cards back to conversation

### Escalation Logic
- **Immediate**: "talk to human", "urgent", "can't login", "billing issue"
- **Confidence < 50%**: Offers "Talk to Human" button
- **Confidence 50-70%** + long message: Adds escalation option
- **Confidence > 70%**: Pure AI response

### Conversation Memory
- Each Intercom conversation maps to 1 AI session
- Session persists across messages (not created fresh each time)
- Conversation history stored in `ai_chat_messages`
- Context includes user role, plan, email for personalization

## What Changed

### Before
- Separate in-app AI chat components
- No Intercom webhook integration
- Manual tool routing in frontend

### After
- Intercom is primary UI
- Webhook routes to existing assistants
- Tool results formatted as rich messages
- Session persistence for context
- Intelligent escalation with buttons

## Next Steps

1. **Monitor** escalation rates and AI confidence
2. **Add** more Custom Actions for advanced workflows
3. **Build** Intercom analytics dashboard in admin
4. **Test** with real users and gather feedback
5. **Iterate** on prompts to improve confidence scores

## Common Issues

**Webhook not firing?** Check signature verification and event subscriptions  
**AI not responding?** Check edge function logs for errors  
**Memory not working?** Verify `intercom_sessions` table and RLS policies  
**Buttons not working?** Ensure Custom Actions registered in Developer Hub  

## Documentation

- Full guide: `docs/intercom-integration.md`
- Assistant prompts: `supabase/functions/assistant/index.ts`
- Provider prompts: `supabase/functions/assistant-provider/index.ts`
- Webhook code: `supabase/functions/intercom-webhook/index.ts`

---

**Status**: ✅ Ready to deploy  
**Last Updated**: 2025-11-03  
**Version**: 1.0
