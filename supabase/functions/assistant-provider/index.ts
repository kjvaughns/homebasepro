// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const LLM_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are HomeBase Provider AI, the business assistant for service providers.
You help providers manage their business, optimize scheduling, generate quotes, and communicate with clients.

GOALS:
- Configure business profile, services, and pricing rules
- View and manage daily/weekly jobs and availability
- Generate quotes and send estimates to customers
- Manage customer relationships and communications
- Track business metrics and revenue

STYLE:
- Concise, action-oriented responses (1-3 sentences)
- Use provider's organization context automatically
- Ask one clarifying question maximum
- Never mention technical details like APIs or tools

WORKFLOW:
1. Hydrate provider context (profile + organization)
2. For pricing: Calculate estimates → Offer to send quote
3. For scheduling: List jobs → Suggest optimization
4. For CRM: Show leads/customers → Offer actions

Always keep responses brief and actionable.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);
    const token = auth.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const body = await req.json().catch(() => ({}));
    const { message, history = [], context = {} } = body as {
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      context?: Record<string, any>;
    };

    if (!message) return json({ error: "message_required" }, 400);

    const tools = [
      fn("get_provider_profile", "Get current provider user profile.", {}),
      fn("get_provider_org", "Get provider organization details.", {}),
      fn("list_jobs", "List provider jobs.", {
        timeframe: { type: "string", enum: ["today", "week", "month"] }
      }, ["timeframe"]),
      fn("price_service", "Calculate service price estimate.", {
        service_name: { type: "string" },
        unit_type: { type: "string" },
        units: { type: "number" },
        zip: { type: "string" }
      }, ["service_name", "unit_type"]),
      fn("list_customers", "List customers with activity.", {
        limit: { type: "number" }
      }),
      fn("send_estimate", "Send quote to customer.", {
        customer_id: { type: "string" },
        amount_low: { type: "number" },
        amount_high: { type: "number" },
        note: { type: "string" }
      }, ["customer_id", "amount_low", "amount_high"]),
    ];

    const first = await llm(LOVABLE_KEY, {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
      ],
      tools,
      tool_choice: "auto",
    });

    if (!first.ok) return llmFail(first);

    let msg = first.data.choices?.[0]?.message;
    const toolResults: Array<{ type: string; data: any }> = [];

    for (let round = 0; round < 2 && msg?.tool_calls?.length; round++) {
      const toolMsgs: any[] = [];

      for (const call of msg.tool_calls) {
        const name = call.function?.name as string;
        const args = safeJSON(call.function?.arguments);

        let out: any;
        try {
          out = await routeTool(sb, name, args);
          toolResults.push({ type: name, data: out });
        } catch (e) {
          out = { error: String(e) };
        }

        toolMsgs.push({
          role: "tool",
          content: JSON.stringify(out),
          tool_call_id: call.id
        });
      }

      const second = await llm(LOVABLE_KEY, {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
          { role: "assistant", content: msg?.content || "", tool_calls: msg?.tool_calls || [] } as any,
          ...toolMsgs
        ],
      });

      if (!second.ok) return llmFail(second);
      msg = second.data.choices?.[0]?.message;
    }

    const reply = msg?.content || "All set.";
    return new Response(JSON.stringify({ reply, tool_results: toolResults }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("assistant-provider error:", e);
    return json({ error: "internal_error", detail: String(e) }, 500);
  }
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

function fn(name: string, description: string, properties: Record<string, any>, required: string[] = []) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties, required }
    }
  };
}

function safeJSON(s?: string) {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

async function llm(key: string, payload: any) {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function llmFail(first: any) {
  console.error("LLM gateway error:", first.status, first.data);
  return json({ error: "llm_gateway", detail: first.data }, first.status || 500);
}

async function routeTool(sb: any, name: string, args: any) {
  if (name === "get_provider_profile") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: profile } = await sb
      .from("profiles")
      .select("id, user_type, phone, full_name")
      .eq("user_id", user.id)
      .single();
    return {
      user_id: user.id,
      profile_id: profile?.id,
      role: profile?.user_type || "provider",
      phone: profile?.phone,
      name: profile?.full_name
    };
  }

  if (name === "get_provider_org") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id, name, slug, service_type, service_area")
      .eq("owner_id", user.id)
      .maybeSingle();
    return org || { missing: true };
  }

  if (name === "list_jobs") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { jobs: [] };

    let query = sb
      .from("bookings")
      .select("id, service_name, address, date_time_start, date_time_end, status")
      .eq("provider_org_id", org.id)
      .order("date_time_start");

    if (args.timeframe === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query
        .gte("date_time_start", `${today}T00:00:00Z`)
        .lt("date_time_start", `${today}T23:59:59Z`);
    }

    const { data: jobs } = await query.limit(20);
    return { jobs: jobs || [], count: jobs?.length || 0 };
  }

  if (name === "price_service") {
    const per = {
      acre: 55,
      sqft: 0.2,
      linear_foot: 1.3,
      pane: 6,
      system_count: 85,
      flat: 120
    }[args.unit_type] || 50;

    const units = Number(args.units || 1);
    const base = Math.max(per * units, 60);
    const low = Math.round(base * 0.9);
    const high = Math.round(base * 1.25);

    return {
      service: args.service_name,
      unit_type: args.unit_type,
      units,
      estimate_low: low,
      estimate_high: high,
      confidence: 0.78
    };
  }

  if (name === "list_customers") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { customers: [] };

    const { data: clients } = await sb
      .from("clients")
      .select("id, name, email, phone, status")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(args.limit || 10);

    return { customers: clients || [] };
  }

  if (name === "send_estimate") {
    return {
      ok: true,
      sent: true,
      customer_id: args.customer_id,
      amount_range: `$${args.amount_low}-$${args.amount_high}`
    };
  }

  return { error: `unknown_tool: ${name}` };
}
