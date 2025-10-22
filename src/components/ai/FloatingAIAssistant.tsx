import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import HomeBaseAI from "./HomeBaseAI";

interface FloatingAIAssistantProps {
  userRole: 'homeowner' | 'provider';
  context?: Record<string, any>;
  onServiceRequestCreated?: (requestId: string) => void;
}

export function FloatingAIAssistant({ userRole, context, onServiceRequestCreated }: FloatingAIAssistantProps) {
  const storageKey = `hbai:session:${userRole}`;
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    // Load persisted session on mount
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || undefined;
    }
    return undefined;
  });

  const handleToggle = () => {
    if (isOpen && !isMinimized) {
      // Minimize instead of closing
      setIsMinimized(true);
    } else if (isMinimized) {
      // Restore from minimized
      setIsMinimized(false);
    } else {
      // Open fresh
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleMinimize = () => {
    // Just minimize, don't close
    setIsMinimized(true);
  };

  const handleServiceRequestCreated = (requestId: string) => {
    onServiceRequestCreated?.(requestId);
  };

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId);
    localStorage.setItem(storageKey, newSessionId);
  };

  const handleClearConversation = () => {
    setSessionId(undefined);
    localStorage.removeItem(storageKey);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={handleToggle}
        size="lg"
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full shadow-lg transition-all active:scale-95",
          "bg-primary hover:bg-primary/90",
          "bottom-[calc(88px+env(safe-area-inset-bottom))] right-4",
          "md:bottom-6 md:right-6"
        )}
        aria-label="Open AI Assistant"
      >
        {isOpen && !isMinimized ? (
          <Minimize2 className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>

      {/* AI Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40 bg-background border shadow-2xl transition-all",
            isMinimized && "hidden",
            // Mobile: full screen
            "inset-0 rounded-none",
            // Desktop: bottom-right panel
            "md:inset-auto md:bottom-24 md:right-8",
            "md:h-[600px] md:w-[420px] md:rounded-lg"
          )}
          data-vaul-no-drag
          style={{ touchAction: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <h3 className="font-semibold">
                HomeBase AI {userRole === 'provider' ? '· Business Assistant' : '· Home Services'}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearConversation}
                className="h-8 text-xs"
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMinimize}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="h-[calc(100%-4rem)] pb-safe">
            <HomeBaseAI
              sessionId={sessionId}
              context={context}
              onServiceRequestCreated={handleServiceRequestCreated}
              onSessionChange={handleSessionChange}
              userRole={userRole}
              autoFocus={!isMinimized}
            />
          </div>
        </div>
      )}
    </>
  );
}
