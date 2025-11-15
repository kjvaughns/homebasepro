import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tradeType, problemDescription } = await req.json();
    
    console.log('Generating questions for:', { tradeType, problemDescription });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert at creating client intake forms for home service businesses. Generate 5-7 essential questions that help the provider understand the client's needs and quote accurately.`;

    const userPrompt = `Generate intake questions for a ${tradeType} business.

Client problems typically include: ${problemDescription}

Create questions that:
1. Help assess urgency and scope
2. Gather key details for accurate quoting
3. Identify potential complexity factors
4. Are easy for homeowners to answer

Use appropriate question types:
- yes_no: For simple binary questions
- multiple_choice: When there are 3-5 common options (include options array)
- text: For descriptive answers
- number: For measurements, quantities
- image: When photos would help (property damage, layout, etc.)

Assign complexity weights (1-10):
- 1-3: Basic info (contact preferences, timing)
- 4-6: Scope details (size, type of work)
- 7-10: Complex factors (age of system, accessibility, emergency status)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_questions',
            description: 'Return 5-7 essential intake questions',
            parameters: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question_text: { type: 'string' },
                      question_type: { 
                        type: 'string',
                        enum: ['text', 'yes_no', 'multiple_choice', 'number', 'image']
                      },
                      options: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Required for multiple_choice questions'
                      },
                      complexity_weight: { 
                        type: 'number',
                        minimum: 1,
                        maximum: 10
                      },
                      is_required: { type: 'boolean' }
                    },
                    required: ['question_text', 'question_type', 'complexity_weight', 'is_required'],
                    additionalProperties: false
                  }
                }
              },
              required: ['questions'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_questions' } }
      }),
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits to your workspace.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to generate questions from AI');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No questions returned from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Generated questions:', result.questions.length);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-intake-questions:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate questions' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
