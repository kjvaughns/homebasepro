import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);
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
      className="fixed bottom-0 left-0 right-0 bg-background border-t z-30 transition-all duration-200"
      style={{
        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0,
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      }}
    >
      <div className="p-3 sm:p-4 flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="flex-1"
          autoComplete="off"
          autoCapitalize="sentences"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isSending}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
