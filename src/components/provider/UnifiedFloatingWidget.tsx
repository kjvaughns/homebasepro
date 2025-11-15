import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sparkles, UserPlus, Calendar, DollarSign, Receipt, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDespia } from '@/hooks/useDespia';
import { AIChatModal } from '@/components/ai/AIChatModal';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
  priority: number;
}

export function UnifiedFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerHaptic } = useDespia();

  const allActions: QuickAction[] = [
    {
      id: 'add-client',
      title: 'Add Client',
      description: 'Create new client',
      icon: UserPlus,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/clients?action=add');
      },
      priority: 1
    },
    {
      id: 'new-job',
      title: 'New Job',
      description: 'Schedule a new job',
      icon: Calendar,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/schedule?action=new');
      },
      priority: 2
    },
    {
      id: 'send-invoice',
      title: 'Send Invoice',
      description: 'Create and send invoice',
      icon: DollarSign,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/money?action=invoice');
      },
      priority: 3
    },
    {
      id: 'record-payment',
      title: 'Record Payment',
      description: 'Log a payment received',
      icon: Receipt,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        navigate('/provider/money?action=payment');
      },
      priority: 4
    },
    {
      id: 'ask-ai',
      title: 'Ask HomeBase AI',
      description: 'Get instant help',
      icon: MessageSquare,
      action: () => {
        triggerHaptic('light');
        setIsOpen(false);
        setShowAIChat(true);
      },
      priority: 5
    },
  ];

  // Context-aware filtering based on current route
  const getContextualActions = () => {
    const pathname = location.pathname;
    
    if (pathname.includes('/money')) {
      // Prioritize financial actions on Money page
      return allActions.sort((a, b) => {
        const moneyActions = ['send-invoice', 'record-payment'];
        const aIsMoney = moneyActions.includes(a.id);
        const bIsMoney = moneyActions.includes(b.id);
        if (aIsMoney && !bIsMoney) return -1;
        if (!aIsMoney && bIsMoney) return 1;
        return a.priority - b.priority;
      });
    }
    
    if (pathname.includes('/schedule')) {
      // Prioritize job actions on Schedule page
      return allActions.sort((a, b) => {
        const scheduleActions = ['new-job', 'add-client'];
        const aIsSchedule = scheduleActions.includes(a.id);
        const bIsSchedule = scheduleActions.includes(b.id);
        if (aIsSchedule && !bIsSchedule) return -1;
        if (!aIsSchedule && bIsSchedule) return 1;
        return a.priority - b.priority;
      });
    }
    
    // Default order for other pages
    return allActions;
  };

  const contextualActions = getContextualActions();

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40 transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
          boxShadow: '0 4px 20px rgba(32, 196, 99, 0.4)',
        }}
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Actions Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-auto max-h-[70vh] rounded-t-3xl border-0 pb-safe"
        >
          <div className="pt-2 pb-4">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
            <h3 className="text-center text-base font-semibold mb-6">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {contextualActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-accent/50 active:bg-accent transition-colors text-center min-h-[110px] justify-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-sm block">{action.title}</span>
                    <span className="text-xs text-muted-foreground">{action.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Chat Modal */}
      <AIChatModal 
        open={showAIChat} 
        onOpenChange={setShowAIChat}
        userRole="provider"
      />
    </>
  );
}
