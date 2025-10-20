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
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

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

  const handleClose = () => {
    // Keep session ID but close the UI
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleServiceRequestCreated = (requestId: string) => {
    setSessionId(undefined); // Start fresh session after completing a request
    onServiceRequestCreated?.(requestId);
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
          "bottom-6 right-6",
          "md:bottom-8 md:right-8"
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
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <h3 className="font-semibold">
                HomeBase AI {userRole === 'provider' ? '· Business Assistant' : '· Home Services'}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Chat Content */}
          <div className="h-[calc(100%-4rem)]">
            <HomeBaseAI
              sessionId={sessionId}
              context={context}
              onServiceRequestCreated={handleServiceRequestCreated}
              userRole={userRole}
            />
          </div>
        </div>
      )}
    </>
  );
}
