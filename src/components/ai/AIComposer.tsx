import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

interface AIComposerProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onHeightChange?: (height: number) => void;
}

export function AIComposer({ 
  onSend, 
  disabled = false, 
  placeholder = "Ask anything...",
  onFocus,
  onHeightChange
}: AIComposerProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const keyboardHeight = useKeyboardHeight();

  // Observe composer height changes
  useEffect(() => {
    if (!composerRef.current || !onHeightChange) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height);
      }
    });

    resizeObserver.observe(composerRef.current);
    return () => resizeObserver.disconnect();
  }, [onHeightChange]);

  const handleSend = async () => {
    if (!input.trim() || isSending || disabled) return;

    const messageText = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await onSend(messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(messageText); // Restore input on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.stopPropagation();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = () => {
    if (onFocus) {
      setTimeout(() => onFocus(), 50);
    }
  };

  return (
    <div
      ref={composerRef}
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 transition-all duration-200"
      style={{
        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0,
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      }}
    >
      <div className="p-4 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none
                   bg-muted/30 border-border focus:border-primary/50
                   focus-visible:ring-primary/20"
          autoComplete="off"
          autoCapitalize="sentences"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isSending}
          size="icon"
          className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 
                   shadow-lg hover:shadow-xl transition-all flex-shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
