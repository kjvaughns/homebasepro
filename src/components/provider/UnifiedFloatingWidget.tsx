import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, UserPlus, Calendar, DollarSign, Receipt, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDespia } from '@/hooks/useDespia';
import { AIChatModal } from '@/components/ai/AIChatModal';

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  action: () => void;
}

export function UnifiedFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerHaptic } = useDespia();

  const actions: QuickAction[] = [
    {
      id: 'ai',
      label: 'Ask AI',
      icon: MessageSquare,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        setShowAIChat(true);
      },
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: Receipt,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/money?action=payment');
      },
    },
    {
      id: 'invoice',
      label: 'Invoice',
      icon: DollarSign,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/money?action=invoice');
      },
    },
    {
      id: 'job',
      label: 'Job',
      icon: Calendar,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/schedule?action=new');
      },
    },
    {
      id: 'client',
      label: 'Client',
      icon: UserPlus,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/clients?action=add');
      },
    },
  ];

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => {
            triggerHaptic('light');
            setIsOpen(false);
          }}
        />
      )}

      {/* Action Buttons (appear above FAB) */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const bottomOffset = (actions.length - index) * 64;
            
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="flex items-center gap-3 animate-scale-in group"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <span className="text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-full shadow-md whitespace-nowrap group-hover:bg-accent transition-colors">
                  {action.label}
                </span>
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
          boxShadow: '0 4px 20px rgba(32, 196, 99, 0.4)',
        }}
      >
        <Sparkles className={`h-6 w-6 text-primary-foreground transition-transform ${isOpen ? 'rotate-45' : ''}`} />
      </Button>

      {/* AI Chat Modal */}
      <AIChatModal 
        open={showAIChat} 
        onOpenChange={setShowAIChat}
        userRole="provider"
      />
    </>
  );
}
