import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HomeBaseAI from "./HomeBaseAI";
import { useState } from "react";

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: 'homeowner' | 'provider';
}

const quickPrompts = [
  "Show my unpaid invoices",
  "What's my revenue this week?",
  "Who should I follow up with?"
];

export function AIChatModal({ open, onOpenChange, userRole = 'provider' }: AIChatModalProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const handlePromptClick = (prompt: string) => {
    setSelectedPrompt(prompt);
    // The HomeBaseAI component will need to handle this
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>HomeBase AI Assistant</DialogTitle>
          <DialogDescription>
            Get instant help with your business tasks and questions
          </DialogDescription>
          {/* Quick Prompts */}
          <div className="flex gap-2 overflow-x-auto pt-3 pb-2">
            {quickPrompts.map(prompt => (
              <Button 
                key={prompt}
                variant="outline" 
                size="sm"
                className="whitespace-nowrap active:scale-95 transition-transform"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <HomeBaseAI userRole={userRole} autoFocus={true} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
