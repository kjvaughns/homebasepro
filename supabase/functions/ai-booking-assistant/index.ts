import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider_id, service_id, intake_responses } = await req.json();

    if (!provider_id || !service_id || !intake_responses) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider and service context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: service } = await supabase
      .from("provider_services")
      .select("service_name, description")
      .eq("id", service_id)
      .single();

    const { data: organization } = await supabase
      .from("organizations")
      .select("name, description, service_type")
      .eq("id", provider_id)
      .single();

    // Create context-aware prompt
    const systemPrompt = `You are an AI assistant helping a service provider understand a potential customer's needs better. 
The provider is "${organization?.name}" offering "${service?.service_name}".
Service description: ${service?.description || "N/A"}

Based on the customer's intake responses, generate 2-3 clarifying questions that would help the provider:
- Better understand the scope of work
- Identify potential complications or special requirements
- Provide a more accurate quote
- Prepare properly for the job

Keep questions conversational, specific, and relevant to the service being requested.`;

    const userPrompt = `Customer's intake responses:
${JSON.stringify(intake_responses, null, 2)}

Generate 2-3 follow-up questions that would be most valuable for the provider to know.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate follow-up questions for the booking",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique identifier for the question" },
                        question: { type: "string", description: "The follow-up question text" }
                      },
                      required: ["id", "question"]
                    },
                    minItems: 2,
                    maxItems: 3
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } }
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      return new Response(
        JSON.stringify({ error: "AI service error", questions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const questions = toolCall ? JSON.parse(toolCall.function.arguments).questions : [];

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in ai-booking-assistant:", error);
    return new Response(
      JSON.stringify({ error: error.message, questions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
