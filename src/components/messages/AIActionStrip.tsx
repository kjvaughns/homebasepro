import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AIActionStripProps {
  conversationId: string;
  onSendMessage: (content: string, type: string, meta: any) => Promise<void>;
}

export function AIActionStrip({ conversationId, onSendMessage }: AIActionStripProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const callAI = async (action: string, params?: any) => {
    setLoading(action);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ conversation_id: conversationId, action, ...params })
        }
      );
      
      const result = await res.json();
      
      if (action === 'summarize' && result.summary) {
        toast.success('Summary generated', {
          description: result.summary.join('\n')
        });
      } else if (action === 'suggest' && result.suggestions) {
        setSuggestions(result.suggestions);
      } else if (action === 'make_quote' && result.quote) {
        await onSendMessage('', 'card', {
          card: {
            type: 'quote',
            ...result.quote
          }
        });
        toast.success('Quote card created');
      }
      
    } catch (error) {
      console.error('AI action error:', error);
      toast.error('AI action failed');
    } finally {
      setLoading(null);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await onSendMessage(suggestion, 'text', {});
    setSuggestions([]);
  };

  return (
    <div className="bg-muted/30 border-t border-border px-3 py-2 space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <AIChip
          onClick={() => callAI('summarize')}
          loading={loading === 'summarize'}
        >
          Summarize
        </AIChip>
        
        <AIChip
          onClick={() => callAI('suggest')}
          loading={loading === 'suggest'}
        >
          Suggest replies
        </AIChip>
        
        <AIChip
          onClick={() => callAI('make_quote', { service_name: 'Service', low: 150, high: 300 })}
          loading={loading === 'make_quote'}
        >
          Create quote
        </AIChip>
      </div>
      
      {suggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-background border border-border hover:bg-muted transition-colors whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AIChip({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className="h-8 text-xs gap-1.5 whitespace-nowrap"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {children}
    </Button>
  );
}