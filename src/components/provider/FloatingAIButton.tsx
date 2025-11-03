import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { AIQuickActions } from './AIQuickActions';

interface FloatingAIButtonProps {
  onAIChat?: () => void;
}

export function FloatingAIButton({ onAIChat }: FloatingAIButtonProps) {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const handleButtonClick = () => {
    setQuickActionsOpen(!quickActionsOpen);
  };

  return (
    <>
      {/* Floating AI Button */}
      <Button
        onClick={handleButtonClick}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40 transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
          boxShadow: '0 4px 20px rgba(32, 196, 99, 0.4)',
        }}
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Quick Actions Menu */}
      <AIQuickActions 
        open={quickActionsOpen} 
        onOpenChange={setQuickActionsOpen}
        onAIChat={onAIChat}
      />
    </>
  );
}
