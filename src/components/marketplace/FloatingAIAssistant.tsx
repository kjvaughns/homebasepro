import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import AIAssistant from "@/components/ai/AIAssistant";

interface FloatingAIAssistantProps {
  context?: any;
  onPropertyFound?: (property: any) => void;
}

export const FloatingAIAssistant = ({ context, onPropertyFound }: FloatingAIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer when keyboard might interfere (mobile optimization)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleResize = () => {
      if (window.visualViewport && window.visualViewport.height < window.innerHeight * 0.7) {
        // Keyboard likely open, don't close - just note it for styling
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 hover:scale-105 transition-transform"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Drawer */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle>HomeBase AI</DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <AIAssistant
              context={context}
              onPropertyFound={onPropertyFound}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
