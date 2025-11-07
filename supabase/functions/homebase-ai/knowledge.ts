import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function searchKnowledge(query: string, maxResults: number = 5) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Search knowledge articles using full-text search
    const { data: articles, error } = await supabase
      .rpc('search_knowledge_articles', {
        search_query: query,
        max_results: maxResults
      });

    if (error) {
      console.error('Knowledge search error:', error);
      return [];
    }

    return articles || [];
  } catch (error) {
    console.error('Failed to search knowledge:', error);
    return [];
  }
}

export async function getQuickReply(userMessage: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all active quick replies
    const { data: replies, error } = await supabase
      .from('ai_quick_replies')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !replies) return null;

    // Find matching reply
    const messageLower = userMessage.toLowerCase();
    const match = replies.find(reply => 
      reply.trigger_keywords?.some((keyword: string) => 
        messageLower.includes(keyword.toLowerCase())
      )
    );

    if (match) {
      // Increment use count
      await supabase
        .from('ai_quick_replies')
        .update({ use_count: match.use_count + 1 })
        .eq('id', match.id);
    }

    return match;
  } catch (error) {
    console.error('Failed to get quick reply:', error);
    return null;
  }
}

export async function trackConversation(sessionData: {
  session_id: string;
  user_id?: string;
  user_role?: string;
  message_count: number;
  tools_used: string[];
  knowledge_articles_used: string[];
  sentiment?: string;
  resolved?: boolean;
  escalated_to_human?: boolean;
  average_response_time_ms?: number;
  conversation_summary?: string;
}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Upsert conversation analytics
    const { error } = await supabase
      .from('ai_conversation_analytics')
      .upsert({
        ...sessionData,
        completed_at: sessionData.resolved ? new Date().toISOString() : null
      }, {
        onConflict: 'session_id'
      });

    if (error) {
      console.error('Failed to track conversation:', error);
    }
  } catch (error) {
    console.error('Failed to track conversation:', error);
  }
}

export function buildKnowledgeContext(articles: any[]): string {
  if (articles.length === 0) return '';

  return `

## Relevant Knowledge Base Articles:

${articles.map(article => `
### ${article.title}
Category: ${article.category}
${article.content}
`).join('\n')}

Use the above knowledge to inform your responses. Cite specific articles when relevant.
`;
}