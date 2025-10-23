import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import HomeBaseAI from "./HomeBaseAI";

interface FloatingAIAssistantProps {
  userRole: 'homeowner' | 'provider';
  context?: Record<string, any>;
  onServiceRequestCreated?: (requestId: string) => void;
}

export function FloatingAIAssistant({ userRole, context, onServiceRequestCreated }: FloatingAIAssistantProps) {
  const storageKey = `hbai:session:${userRole}`;
  
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    // Load persisted session on mount
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || undefined;
    }
    return undefined;
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Blur input and hide keyboard when closing
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    }
    setIsOpen(open);
  };

  const handleServiceRequestCreated = (requestId: string) => {
    onServiceRequestCreated?.(requestId);
  };

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId);
    localStorage.setItem(storageKey, newSessionId);
  };

  const handleClearConversation = () => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    localStorage.setItem(storageKey, newSessionId);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full shadow-lg transition-all active:scale-95",
          "bg-primary hover:bg-primary/90",
          "bottom-[calc(88px+env(safe-area-inset-bottom))] right-4",
          "md:bottom-6 md:right-6"
        )}
        aria-label="Open AI Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* AI Chat Drawer */}
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent 
          className={cn(
            "h-[90vh] max-h-[90vh]",
            "md:h-[600px] md:max-h-[600px]",
            "flex flex-col"
          )}
        >
          <DrawerHeader className="border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              <DrawerTitle className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                HomeBase AI {userRole === 'provider' ? '· Business Assistant' : '· Home Services'}
              </DrawerTitle>
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
                  onClick={() => handleOpenChange(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          {/* Chat Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <HomeBaseAI
              sessionId={sessionId}
              context={context}
              onServiceRequestCreated={handleServiceRequestCreated}
              onSessionChange={handleSessionChange}
              userRole={userRole}
              autoFocus={isOpen}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
