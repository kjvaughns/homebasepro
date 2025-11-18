import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user and organization
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, service_type')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Gather business data for AI context
    const { data: clients } = await supabase
      .from('clients')
      .select('id, status')
      .eq('organization_id', org.id);

    const { data: jobs } = await supabase
      .from('bookings')
      .select('id, status, date_time_start, final_price')
      .eq('provider_org_id', org.id)
      .gte('date_time_start', new Date().toISOString())
      .order('date_time_start', { ascending: true })
      .limit(20);

    const { data: unpaidInvoices } = await supabase
      .from('payments')
      .select('amount')
      .eq('org_id', org.id)
      .in('status', ['pending', 'open']);

    const totalUnpaid = unpaidInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const activeClients = clients?.filter(c => c.status === 'active').length || 0;
    const upcomingJobs = jobs?.length || 0;

    const businessContext = {
      businessType: org.service_type?.join(', ') || 'Home Services',
      activeClients,
      upcomingJobs,
      totalUnpaid: (totalUnpaid / 100).toFixed(2),
      unpaidCount: unpaidInvoices?.length || 0
    };

    // Call Lovable AI for insights
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a business advisor for a ${businessContext.businessType} company. Generate 3-5 actionable, specific insights based on their current business data. Focus on revenue opportunities, efficiency improvements, and client engagement. Be concise (under 80 characters per insight).`
          },
          {
            role: 'user',
            content: `Business data: ${activeClients} active clients, ${upcomingJobs} upcoming jobs, $${businessContext.totalUnpaid} unpaid from ${businessContext.unpaidCount} invoices. Generate specific insights.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Return 3-5 actionable business insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        type: { type: "string", enum: ["tip", "alert", "suggestion"] }
                      },
                      required: ["text", "type"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["insights"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      // Return fallback insights on error
      return new Response(JSON.stringify({ 
        insights: [
          { text: "Review unpaid invoices and send reminders", type: "alert" },
          { text: "Schedule preventive maintenance for active clients", type: "tip" },
          { text: "Consider offering seasonal service packages", type: "suggestion" }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const insights = toolCall ? JSON.parse(toolCall.function.arguments).insights : [];

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-dashboard-insights:', error);
    // Return fallback insights
    return new Response(JSON.stringify({ 
      insights: [
        { text: "Review your business metrics and client engagement", type: "tip" },
        { text: "Follow up on outstanding invoices", type: "alert" },
        { text: "Plan ahead for upcoming service appointments", type: "suggestion" }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
