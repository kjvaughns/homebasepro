import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { MessageSquare, FileText, Calendar, UserPlus, DollarSign } from "lucide-react";
import { useDespia } from "@/hooks/useDespia";

interface AIQuickActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAIChat?: () => void;
}

export function AIQuickActions({ open, onOpenChange, onAIChat }: AIQuickActionsProps) {
  const navigate = useNavigate();
  const { triggerHaptic } = useDespia();

  const quickActions = [
    { 
      title: "Ask AI Assistant", 
      description: "Chat with HomeBase AI",
      icon: MessageSquare, 
      action: () => {
        triggerHaptic('light');
        onOpenChange(false);
        if (onAIChat) onAIChat();
      }
    },
    { 
      title: "Create Quote", 
      description: "Generate a new quote",
      icon: FileText, 
      action: () => {
        triggerHaptic('light');
        navigate('/provider/schedule?tab=quotes');
        onOpenChange(false);
      }
    },
    { 
      title: "New Job", 
      description: "Schedule a new job",
      icon: Calendar, 
      action: () => {
        triggerHaptic('light');
        navigate('/provider/schedule');
        onOpenChange(false);
      }
    },
    { 
      title: "Add Client", 
      description: "Create new client",
      icon: UserPlus, 
      action: () => {
        triggerHaptic('light');
        navigate('/provider/clients');
        onOpenChange(false);
      }
    },
    { 
      title: "Send Invoice", 
      description: "Create and send invoice",
      icon: DollarSign, 
      action: () => {
        triggerHaptic('light');
        navigate('/provider/money');
        onOpenChange(false);
      }
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl border-0 pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-base font-semibold">Quick Actions</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 py-2 px-2">
          {quickActions.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-accent/50 active:bg-accent transition-colors text-center min-h-[100px] justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="font-medium text-sm block">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
