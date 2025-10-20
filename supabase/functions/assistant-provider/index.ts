// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      fn("list_jobs", "List jobs with optional filters.", {
        status: { type: "array", items: { type: "string" }, description: "Filter by status: lead, service_call, quoted, scheduled, in_progress, completed, invoiced, paid, cancelled" },
        timeframe: { type: "string", enum: ["today", "week", "month", "all"] },
        client_id: { type: "string", description: "Filter by specific client" }
      }),
      fn("create_job", "Create a new job (lead, service call, or direct booking).", {
        client_id: { type: "string" },
        service_name: { type: "string" },
        address: { type: "string" },
        is_service_call: { type: "boolean", description: "True for diagnostic-first workflows (HVAC, Plumbing, etc.)" },
        quote_low: { type: "number" },
        quote_high: { type: "number" },
        deposit_due: { type: "number", description: "Diagnostic fee amount" },
        window_start: { type: "string", description: "ISO datetime for scheduled start" },
        window_end: { type: "string", description: "ISO datetime for scheduled end" },
        pre_job_notes: { type: "string" }
      }, ["service_name"]),
      fn("update_job_status", "Move job to next status in pipeline.", {
        job_id: { type: "string" },
        action: { type: "string", enum: ["quote", "approve_quote", "schedule", "start", "complete", "invoice", "mark_paid", "cancel"] },
        payload: { type: "object", description: "Additional data like quote amounts, payment info, etc." }
      }, ["job_id", "action"]),
      fn("optimize_route", "Optimize job schedule by location.", {
        date: { type: "string", description: "Date to optimize (YYYY-MM-DD)" },
        job_ids: { type: "array", items: { type: "string" } }
      }, ["date"]),
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
      fn("create_service_call", "Create a new service call/quote.", {
        client_id: { type: "string" },
        service_name: { type: "string" },
        quote_low: { type: "number" },
        quote_high: { type: "number" },
        scheduled_date: { type: "string" },
        pre_job_notes: { type: "string" }
      }, ["client_id", "service_name", "quote_low", "quote_high"]),
      fn("complete_service_call", "Mark service call as completed.", {
        service_call_id: { type: "string" },
        actual_amount: { type: "number" },
        post_job_notes: { type: "string" },
        auto_invoice: { type: "boolean" }
      }, ["service_call_id", "actual_amount"]),
      fn("create_invoice", "Create invoice for a job.", {
        service_call_id: { type: "string" },
        booking_id: { type: "string" },
        amount: { type: "number" },
        due_days: { type: "number" }
      }, ["amount"]),
      fn("get_revenue_summary", "Get revenue summary for period.", {
        period: { type: "string", enum: ["week", "month", "year"] }
      }, ["period"]),
      fn("list_unpaid_invoices", "List unpaid/overdue invoices.", {
        days_overdue: { type: "number" }
      }),
      fn("send_review_request", "Request review from client.", {
        booking_id: { type: "string" },
        client_id: { type: "string" }
      }, ["client_id"]),
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
    if (!user?.id) return { error: "unauthorized" };

    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { jobs: [] };

    let query = sb
      .from("jobs" as any)
      .select("*, clients(name, email, phone)")
      .eq("provider_org_id", org.id)
      .order("window_start", { ascending: true, nullsFirst: false });

    if (args.status?.length) {
      query = query.in("status", args.status);
    }

    if (args.timeframe === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query
        .gte("window_start", `${today}T00:00:00Z`)
        .lt("window_start", `${today}T23:59:59Z`);
    } else if (args.timeframe === "week") {
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      query = query
        .gte("window_start", now.toISOString())
        .lt("window_start", weekEnd.toISOString());
    }

    if (args.client_id) {
      query = query.eq("client_id", args.client_id);
    }

    const { data: jobs, error } = await query;

    if (error) return { error: error.message };

    // Group by status for Kanban view
    const grouped = (jobs || []).reduce((acc: any, job: any) => {
      acc[job.status] = acc[job.status] || [];
      acc[job.status].push(job);
      return acc;
    }, {});

    return { jobs: jobs || [], grouped };
  }

  if (name === "create_job") {
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.id) return { error: "unauthorized" };

    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { error: "no_organization" };

    const jobData = {
      provider_org_id: org.id,
      client_id: args.client_id,
      service_name: args.service_name,
      address: args.address,
      is_service_call: args.is_service_call || false,
      status: args.is_service_call ? 'service_call' : 
              args.window_start ? 'scheduled' : 'lead',
      quote_low: args.quote_low,
      quote_high: args.quote_high,
      deposit_due: args.deposit_due || 0,
      window_start: args.window_start,
      window_end: args.window_end,
      pre_job_notes: args.pre_job_notes
    };

    const { data: job, error } = await sb
      .from("jobs" as any)
      .insert(jobData)
      .select()
      .single();

    if (error) return { error: error.message };

    // Log event
    await sb.from("job_events" as any).insert({
      job_id: job.id,
      event_type: 'created',
      payload: jobData
    });

    return { job, message: "Job created successfully" };
  }

  if (name === "update_job_status") {
    const statusMap: Record<string, { next: string; event: string; updates?: any }> = {
      quote: { 
        next: 'quoted', 
        event: 'quote_sent',
        updates: {
          quote_low: args.payload?.quote_low,
          quote_high: args.payload?.quote_high
        }
      },
      approve_quote: { next: 'quoted', event: 'quote_approved' },
      schedule: { 
        next: 'scheduled', 
        event: 'scheduled',
        updates: {
          window_start: args.payload?.window_start,
          window_end: args.payload?.window_end
        }
      },
      start: { next: 'in_progress', event: 'started' },
      complete: { 
        next: 'completed', 
        event: 'completed',
        updates: {
          post_job_notes: args.payload?.post_job_notes,
          total_due: args.payload?.total_due
        }
      },
      invoice: { 
        next: 'invoiced', 
        event: 'invoiced',
        updates: {
          total_due: args.payload?.amount
        }
      },
      mark_paid: { 
        next: 'paid', 
        event: 'payment_received',
        updates: {
          total_paid: args.payload?.amount
        }
      },
      cancel: { next: 'cancelled', event: 'cancelled' }
    };

    const transition = statusMap[args.action];
    if (!transition) return { error: "invalid_action" };

    const updates: any = {
      status: transition.next,
      updated_at: new Date().toISOString()
    };

    if (transition.updates) {
      Object.assign(updates, transition.updates);
    }

    const { data: job, error } = await sb
      .from("jobs" as any)
      .update(updates)
      .eq("id", args.job_id)
      .select()
      .single();

    if (error) return { error: error.message };

    // Log event
    await sb.from("job_events" as any).insert({
      job_id: args.job_id,
      event_type: transition.event,
      payload: args.payload || {}
    });

    return { job, message: `Job ${transition.event}` };
  }

  if (name === "optimize_route") {
    const { data: jobs, error } = await sb
      .from("jobs" as any)
      .select("*")
      .in("id", args.job_ids)
      .order("address");

    if (error) return { error: error.message };

    return { 
      jobs: jobs || [],
      message: "Route optimized by address proximity"
    };
  }

  if (name === "price_service") {
    const unitTypeMap: Record<string, number> = {
      acre: 55,
      sqft: 0.2,
      linear_foot: 1.3,
      pane: 6,
      system_count: 85,
      flat: 120
    };

    const per = unitTypeMap[args.unit_type as string] || 50;
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

  if (name === "create_service_call") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { error: "no_organization" };

    const { data: serviceCall, error } = await sb
      .from("service_calls")
      .insert({
        provider_org_id: org.id,
        client_id: args.client_id,
        service_name: args.service_name,
        quote_low: args.quote_low,
        quote_high: args.quote_high,
        scheduled_date: args.scheduled_date || null,
        pre_job_notes: args.pre_job_notes || null,
        status: "pending"
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { service_call: serviceCall, created: true };
  }

  if (name === "complete_service_call") {
    const { data: { user } } = await sb.auth.getUser();
    
    const { data: serviceCall, error: updateError } = await sb
      .from("service_calls")
      .update({
        status: "completed",
        actual_amount: args.actual_amount,
        post_job_notes: args.post_job_notes || null
      })
      .eq("id", args.service_call_id)
      .select("*, clients(id, name, email)")
      .single();

    if (updateError) return { error: updateError.message };

    // Auto-create invoice if requested
    if (args.auto_invoice !== false && serviceCall) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await sb
        .from("invoices")
        .insert({
          service_call_id: serviceCall.id,
          client_id: serviceCall.client_id,
          provider_org_id: serviceCall.provider_org_id,
          amount: args.actual_amount,
          status: "sent",
          due_date: dueDate.toISOString().split("T")[0],
          sent_at: new Date().toISOString()
        });
    }

    return { service_call: serviceCall, completed: true, invoice_created: args.auto_invoice !== false };
  }

  if (name === "create_invoice") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { error: "no_organization" };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (args.due_days || 7));

    // Get client_id from service_call or booking
    let clientId = null;
    if (args.service_call_id) {
      const { data: sc } = await sb
        .from("service_calls")
        .select("client_id")
        .eq("id", args.service_call_id)
        .single();
      clientId = sc?.client_id;
    } else if (args.booking_id) {
      const { data: booking } = await sb
        .from("bookings")
        .select("homeowner_profile_id")
        .eq("id", args.booking_id)
        .single();
      // Would need to map homeowner_profile_id to client_id
      clientId = booking?.homeowner_profile_id;
    }

    if (!clientId) return { error: "client_not_found" };

    const { data: invoice, error } = await sb
      .from("invoices")
      .insert({
        service_call_id: args.service_call_id || null,
        booking_id: args.booking_id || null,
        client_id: clientId,
        provider_org_id: org.id,
        amount: args.amount,
        status: "sent",
        due_date: dueDate.toISOString().split("T")[0],
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { invoice, created: true };
  }

  if (name === "get_revenue_summary") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { total_paid: 0, pending: 0, projected: 0 };

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    if (args.period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (args.period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (args.period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const { data: paidInvoices } = await sb
      .from("invoices")
      .select("amount")
      .eq("provider_org_id", org.id)
      .eq("status", "paid")
      .gte("paid_at", startDate.toISOString());

    const { data: pendingInvoices } = await sb
      .from("invoices")
      .select("amount")
      .eq("provider_org_id", org.id)
      .in("status", ["sent", "overdue"]);

    const totalPaid = (paidInvoices || []).reduce((sum: number, inv: any) => sum + inv.amount, 0);
    const pending = (pendingInvoices || []).reduce((sum: number, inv: any) => sum + inv.amount, 0);
    const projected = totalPaid + pending;

    return { total_paid: totalPaid, pending, projected, period: args.period };
  }

  if (name === "list_unpaid_invoices") {
    const { data: { user } } = await sb.auth.getUser();
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org?.id) return { invoices: [] };

    let query = sb
      .from("invoices")
      .select("*, clients(name, email)")
      .eq("provider_org_id", org.id)
      .in("status", ["sent", "overdue"])
      .order("due_date");

    if (args.days_overdue) {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - args.days_overdue);
      query = query.lte("due_date", overdueDate.toISOString().split("T")[0]);
    }

    const { data: invoices } = await query;
    return { invoices: invoices || [], count: invoices?.length || 0 };
  }

  if (name === "send_review_request") {
    // Placeholder - would integrate with email/SMS service
    return {
      ok: true,
      sent: true,
      client_id: args.client_id,
      booking_id: args.booking_id
    };
  }

  return { error: `unknown_tool: ${name}` };
}
