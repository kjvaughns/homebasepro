import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight } from 'lucide-react';

interface AIEscalateButtonProps {
  conversationContext: Array<{ role: string; content: string }>;
  reason?: string;
}

export function AIEscalateButton({ conversationContext, reason = 'user_request' }: AIEscalateButtonProps) {
  const handleEscalate = () => {
    try {
      // Build context summary for human agent
      const contextSummary = conversationContext
        .slice(-6) // Last 6 messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
        .join('\n\n');

      // Try to access Intercom if available
      if (typeof window !== 'undefined' && (window as any).Intercom) {
        const IntercomAPI = (window as any).Intercom;
        
        // Update user attributes
        IntercomAPI('update', { 
          ai_escalation: true,
          escalation_reason: reason,
          last_conversation: contextSummary
        });

        // Show Intercom messenger with pre-filled context
        IntercomAPI('showNewMessage', 
          `I need help with the following issue:\n\n[AI Conversation Context]\n${contextSummary}\n\n---\nMy specific question:`
        );
      } else {
        console.warn('Intercom not available');
      }
    } catch (error) {
      console.error('Error escalating to Intercom:', error);
    }
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Need to talk to a human?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect with our support team for personalized help
            </p>
          </div>
        </div>
        <Button 
          onClick={handleEscalate}
          variant="outline"
          className="w-full"
          size="sm"
        >
          Start Live Chat
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
