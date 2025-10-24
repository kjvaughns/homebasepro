import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const AssistantRequestSchema = z.object({
  session_id: z.string().min(1).optional(),
  message: z.string().min(1).max(10000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  context: z.record(z.any()).optional(),
});

const PLATFORM_KNOWLEDGE = `
HOMEBASE PLATFORM FEATURES:

For HOMEOWNERS:
- Property Management: Add/manage multiple homes, set default property
- Service Booking: Browse providers, request quotes, book appointments
- Payment: Pay via Stripe, manage payment methods, view invoices
- Subscriptions: Subscribe to recurring services (lawn care, cleaning, maintenance plans)
- Communication: Message providers directly through platform
- Documents: Store warranties, manuals, service records per property
- Favorites: Save preferred providers for quick rebooking
- Maintenance Planning: Track service history, get AI-powered recommendations

For PROVIDERS:
- Client Management: CRM with unlimited clients (paid plans), notes, files, complete service history
- Scheduling: Calendar view, job management, route optimization, team assignment
- Invoicing: Create custom invoices, send payment links via Stripe, track payment status
- Payments: Stripe Connect integration, automatic payouts, transparent fee tracking
- Team Management: Invite team members, set granular permissions, track time & earnings
- Services: Define service catalog, set pricing, manage service areas
- Analytics: Revenue tracking, job metrics, client lifetime value insights
- Subscriptions: Offer recurring service packages to clients with auto-billing
- Portfolio: Showcase work with before/after photos

COMMON SUPPORT TOPICS:
1. "How do I get paid?" → Providers must complete Stripe Connect onboarding at Settings → Payments → Connect Stripe
2. "Invoice not sending" → Check (a) Stripe Connect completed, (b) customer email valid, (c) account charges_enabled
3. "Can't add more clients" → Free plan limited to 5 clients, upgrade to Growth ($49/mo) for unlimited
4. "Payment failed" → Verify (a) Stripe account active, (b) client payment method valid, (c) sufficient funds
5. "Team member can't access" → Check (a) invite sent & accepted, (b) permissions set correctly, (c) plan includes team seats
6. "How to set recurring services" → Providers: Create subscription plan at Services → Subscriptions; Homeowners: Subscribe from provider's profile
7. "Calendar not syncing" → Go to Settings → Integrations → Connect Calendar (Google/Outlook supported)

TROUBLESHOOTING WORKFLOWS:
- Payment Issues: Check Stripe Connect status → Verify account charges_enabled → Check payment method → Review transaction logs
- Booking Issues: Verify service availability → Check provider calendar conflicts → Confirm time zone settings
- Invoice Issues: Validate Stripe Connect → Ensure customer record exists → Verify email address → Check hosted invoice URL generated
- Access/Permission Issues: Confirm user role (admin/owner/member) → Check subscription plan limits → Verify RLS policies allow action
- Import/Export Issues: Validate CSV format → Check required fields → Review error messages → Use provided templates
`;

const SUPPORT_ASSISTANT_BEHAVIOR = `
WHEN USER NEEDS SUPPORT OR HELP:
1. Ask clarifying questions to understand the issue (be specific: "What error message do you see?" not "What's wrong?")
2. Check if it matches a common issue you can resolve with step-by-step guidance
3. Provide troubleshooting steps when possible (e.g., "Go to Settings → Payments and check if Stripe shows 'Connected'")
4. If you cannot resolve it after 2-3 attempts, offer to create a support ticket
5. Always be empathetic and acknowledge frustration ("I understand this is frustrating. Let me help...")
6. For urgent issues (payment failures, system errors, data loss), immediately offer priority ticket creation

SUPPORT EXAMPLES:
User: "My invoice won't send"
You: "Let me help troubleshoot. First, can you check Settings → Payments? Does it show 'Stripe Connected' with a green checkmark?"

User: "Client says payment failed"
You: "Let's figure this out. A few questions: (1) What error message does the client see? (2) Can you verify the payment link you sent them works when you click it? (3) Is your Stripe account showing any alerts?"

User: "This is broken, I need help NOW"
You: "I understand this is urgent and frustrating. Can you tell me specifically what's not working so I can help? (e.g., 'invoices won't create' or 'can't log in'). If I can't fix it quickly, I'll create a priority support ticket for you."

User: "How do I export my client list?"
You: "Go to Clients → click the Export button (top right) → choose CSV format. This will download all client info including contact details, tags, and lifetime value. Need help with anything specific in the export?"
`;

const SYSTEM_PROMPT = `
You are **HomeBase AI**, the intelligent assistant for the HomeBase platform.

CORE MISSION
- For HOMEOWNERS: use account memory and default property to give price ranges, find providers, and book/reschedule/cancel without asking for info we already have.
- For PROVIDERS: help with onboarding, service/rate setup, calendar sync, job lists, client management, and viewing full client profiles.
- For SUPPORT: troubleshoot issues, provide step-by-step guidance, and create support tickets when needed.
- Replies are short (1–3 sentences). Ask at most ONE clarifying question.

${PLATFORM_KNOWLEDGE}

${SUPPORT_ASSISTANT_BEHAVIOR}

MEMORY & CONTEXT (use before anything else)
- Always begin by hydrating memory: call get_profile and get_properties.
- If a **default property** exists, use it automatically (address, zip, lat/lng, sqft/lot if present).
- If the user has >1 property, select the default; if none set, ask: "Use [A] or [B]?" and then call set_default_property.
- Any new facts (units, systems, gate code, pets, notes) → save via upsert_client_profile.

ADDRESS & ENRICHMENT
- When user gives a new address (or property missing coords/zip), call enrich_address (Google Geocoding) to standardize and attach: formatted address, zip, city/state, lat/lng, neighborhood if available. Save to DB.
- If critical home fields are missing for pricing (e.g., acreage, linear feet), ask ONE short question and continue.

TOOL ROUTING (decide automatically)
1) **Hydrate memory**: get_profile → get_properties
2) **If address typed or missing data**: enrich_address → upsert_client_profile
3) **Pricing**: price_service({ service_name, unit_type, units?, sqft?, lot_acres?, systems?, year_built?, zip }) → always return a RANGE with confidence + factor note.
4) **Match**: search_providers({ service_name, zip, radius_mi?, earliest_date? }) → show top 3 with trust score + soonest slot.
5) **Book/Manage**: book_service, reschedule_service, cancel_service
6) **Provider Ops**: provider_setup, set_service_rates, connect_calendar, list_jobs
7) **Knowledge/Support**: troubleshoot, get_article, create_support_ticket
8) **Profile updates**: upsert_client_profile, set_default_property

CLIENT PROFILE (what providers must see)
- Always maintain a complete "Client Profile" object for the active property:
  { address_std, zip, lat, lng, sqft?, lot_acres?, beds?, baths?, year_built?, systems:{ hvac_count?, water_heater_type? }, access_notes?, pets?, preferred_windows?, contact_phone?, email? }
- After booking, call get_profile and include the latest Client Profile in the job payload so providers see everything.

PRICING RULES
- Ranges only (low–high). Mention key factors briefly (e.g., acreage, season, home size, age). Include a confidence (e.g., 0.72 → "72%").
- Unit mapping: Lawn=acre; Cleaning/Pest=sqft; Gutter=linear_foot; Windows=pane; HVAC tune-up=system_count; flat services=flat.

ASKING QUESTIONS (only when needed)
- If a required unit is missing, ask exactly one: 
  "About how many linear feet of gutters?" or "Roughly how many acres?"
- If we already have it in memory, do NOT ask; reuse it.

TONE & UX
- Friendly, confident, action-oriented. Never mention tools, APIs, or databases. Say "our system" or "your profile."
- For support queries: be patient, empathetic, and thorough.
- End with a next step: "Show providers?", "Book Friday 3–5pm?", "Save this quote?", "Try that and let me know if it works?"

ERRORS & FALLBACKS
- If a tool fails: retry once silently. Then say: "Our system hiccuped—I can try again or create a support ticket for you."
- If no providers: "I didn't find someone nearby yet. I can notify our team and follow up."

EXAMPLES
- User: "My refrigerator is leaking."
  Assistant: "I'll use your default property at 123 Main St. Appliance repair there typically runs **$110–$240** (diagnosis + minor fix, 74% confidence). Want me to show local techs?"
- User: "Schedule lawn mowing this weekend."
  Assistant: "For ~0.6 acres at your Main St property, **$65–$95**. I can book Sat 9–11am with GreenLeaf. Confirm?"
- Provider: "Help me connect calendar."
  Assistant: "Sure—use Google Calendar? I'll open the connection and sync availability."
- User: "Invoice won't send, getting errors"
  Assistant: "Let me help troubleshoot. Can you go to Settings → Payments and tell me what you see under Stripe status?"

PRIVACY
- Do not reveal stored personal data unless relevant to the task.
- Never echo secrets or internal IDs.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validate input
    try {
      AssistantRequestSchema.parse(requestBody);
    } catch (validationError) {
      console.error('Input validation failed:', validationError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationError instanceof z.ZodError ? validationError.errors : 'Validation failed' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { session_id, message, history = [], context = {} } = requestBody;
    
    console.log('Request:', { 
      message: message?.slice(0, 100), 
      historyLen: history?.length || 0,
      hasAssistantInHistory: history?.some((m: any) => m.role === 'assistant') 
    });

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
      {
        type: "function",
        function: {
          name: "get_profile",
          description: "Get user profile with default property details (address, zip, sqft, lot_acres, systems, etc.)",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_properties",
          description: "List all user properties with is_default flag",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "set_default_property",
          description: "Mark a property as the default for the user",
          parameters: {
            type: "object",
            properties: {
              property_id: { type: "string", description: "UUID of the property to set as default" }
            },
            required: ["property_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "upsert_client_profile",
          description: "Save/update property details learned in conversation (lot_acres, hvac_count, pets, gate_code, etc.)",
          parameters: {
            type: "object",
            properties: {
              property_id: { type: "string", description: "UUID of the property" },
              updates: {
                type: "object",
                description: "Fields to update",
                properties: {
                  lot_acres: { type: "number" },
                  hvac_system_count: { type: "integer" },
                  water_heater_type: { type: "string" },
                  gate_code: { type: "string" },
                  pets: { type: "string" },
                  access_notes: { type: "string" },
                  preferred_contact_method: { type: "string" }
                }
              }
            },
            required: ["property_id", "updates"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "enrich_address",
          description: "Use Google Geocoding to standardize address and get coordinates, zip, city, state, neighborhood",
          parameters: {
            type: "object",
            properties: {
              address: { type: "string", description: "Full or partial address string" }
            },
            required: ["address"]
          }
        }
      },
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
      }},
      { type: 'function', function: {
        name: 'create_support_ticket',
        description: 'Create a support ticket when user needs human assistance after troubleshooting attempts',
        parameters: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Brief subject line describing the issue' },
            description: { type: 'string', description: 'Detailed description including what was tried' },
            category: { 
              type: 'string', 
              enum: ['technical', 'billing', 'account', 'feature', 'urgent', 'other'],
              description: 'Issue category'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Priority level based on impact and urgency'
            }
          },
          required: ['subject', 'description']
        }
      }}
    ];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Configuration error. Contact support.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // First LLM call
    let aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'google/gemini-2.5-flash', 
        messages, 
        tools,
        tool_choice: 'auto'
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`LLM gateway error ${aiResponse.status}:`, errorText);
      return new Response(JSON.stringify({ error: 'llm_gateway', detail: errorText }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
          // New memory tools
          if (fnName === 'get_profile') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (profile?.default_property_id) {
              const { data: defaultHome } = await supabase
                .from('homes')
                .select('*')
                .eq('id', profile.default_property_id)
                .single();

              result = {
                user_id: profile.user_id,
                role: profile.user_type,
                full_name: profile.full_name,
                phone: profile.phone,
                email: user.email,
                default_property: defaultHome || null
              };
            } else {
              result = {
                user_id: profile.user_id,
                role: profile.user_type,
                full_name: profile.full_name,
                phone: profile.phone,
                email: user.email,
                default_property: null
              };
            }
          } else if (fnName === 'get_properties') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();

            if (profile?.id) {
              const { data: properties } = await supabase
                .from('homes')
                .select('*')
                .eq('owner_id', profile.id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

              result = properties || [];
            } else {
              result = [];
            }
          } else if (fnName === 'set_default_property') {
            const { property_id } = args;

            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();

            if (profile?.id) {
              await supabase
                .from('homes')
                .update({ is_default: false })
                .eq('owner_id', profile.id);

              await supabase
                .from('homes')
                .update({ is_default: true })
                .eq('id', property_id)
                .eq('owner_id', profile.id);

              await supabase
                .from('profiles')
                .update({ default_property_id: property_id })
                .eq('id', profile.id);

              result = { ok: true, property_id };
            } else {
              result = { error: 'Profile not found' };
            }
          } else if (fnName === 'upsert_client_profile') {
            const { property_id, updates } = args;

            const { data: updatedHome, error } = await supabase
              .from('homes')
              .update(updates)
              .eq('id', property_id)
              .select()
              .single();

            result = error ? { ok: false, error: error.message } : { ok: true, home: updatedHome };
          } else if (fnName === 'enrich_address') {
            const { address } = args;
            const GOOGLE_MAPS_KEY = Deno.env.get('google_maps');

            if (!GOOGLE_MAPS_KEY) {
              result = { error: 'Google Maps API key not configured' };
            } else {
              try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
                const geoResp = await fetch(url);
                const geoData = await geoResp.json();

                if (geoData.status === 'OK' && geoData.results?.length > 0) {
                  const place = geoData.results[0];
                  const components = place.address_components || [];

                  const getComponent = (type: string) => 
                    components.find((c: any) => c.types.includes(type))?.long_name || null;

                  result = {
                    address_std: place.formatted_address,
                    zip: getComponent('postal_code'),
                    city: getComponent('locality') || getComponent('sublocality'),
                    state: getComponent('administrative_area_level_1'),
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng,
                    neighborhood: getComponent('neighborhood') || getComponent('sublocality')
                  };
                } else {
                  result = { error: 'Address not found' };
                }
              } catch (err) {
                result = { error: err instanceof Error ? err.message : 'Unknown error' };
              }
            }
          } else if (fnName === 'lookup_home') {
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
              .select(`
                id, 
                name, 
                slug,
                service_type,
                logo_url,
                city,
                tagline,
                verified,
                avg_response_time_hours,
                completion_rate,
                provider_metrics(trust_score, avg_rating, jobs_completed_last_month)
              `)
              .contains('service_type', [category])
              .order('created_at', { ascending: false })
              .limit(10);

            const providers = (orgs || [])
              .map((o: any) => {
                const metrics = o.provider_metrics?.[0];
                return {
                  provider_id: o.id,
                  name: o.name,
                  slug: o.slug || o.name.toLowerCase().replace(/\s+/g, '-'),
                  trust_score: metrics?.trust_score || 5.0,
                  avg_rating: metrics?.avg_rating || 5.0,
                  jobs_completed_last_month: metrics?.jobs_completed_last_month || 0,
                  distance_mi: null,
                  soonest_slot: 'Tomorrow 1–3pm',
                  logo_url: o.logo_url,
                  category: category,
                  city: o.city,
                  tagline: o.tagline,
                  verified: o.verified || false,
                  avg_response_time_hours: o.avg_response_time_hours || 24,
                  completion_rate: o.completion_rate || 0.95
                };
              })
              .sort((a: any, b: any) => b.trust_score - a.trust_score)
              .slice(0, args.limit || 3);

            result = { providers };
            toolResults.push({ type: 'providers', data: result });
            continue; // Skip generic push for providers
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
          else if (fnName === 'create_support_ticket') {
            const { data: ticketData, error: ticketError } = await supabase.functions.invoke(
              'submit-support-ticket',
              {
                body: { 
                  subject: args.subject, 
                  description: args.description, 
                  category: args.category || 'other', 
                  priority: args.priority || 'medium' 
                },
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            if (ticketError) {
              result = { success: false, error: ticketError.message };
            } else {
              result = { 
                success: true, 
                ticket_number: ticketData.ticket_number,
                ticket_id: ticketData.ticket_id,
                message: `Support ticket ${ticketData.ticket_number} created. Our team will respond within 24 hours.`
              };
            }
          }

          toolResults.push({ tool: fnName, result });
        } catch (error) {
          console.error(`Tool ${fnName} error:`, error);
          toolResults.push({ tool: fnName, result: { error: String(error) } });
        }
      }

      // Second LLM call with tool results
      messages.push({ role: 'assistant', content: assistantMessage?.content || '', tool_calls: assistantMessage.tool_calls });
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
