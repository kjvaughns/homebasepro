import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HomeBaseAI from "./HomeBaseAI";
import { useState } from "react";
import { Bot, X, Sparkles, DollarSign, Calendar, TrendingUp, Wrench, Home as HomeIcon, Receipt } from "lucide-react";

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: 'homeowner' | 'provider';
}

const providerQuickActions = [
  { id: 'unpaid', label: 'Show unpaid invoices', icon: Receipt },
  { id: 'revenue', label: "This week's revenue", icon: TrendingUp },
  { id: 'followup', label: 'Who to follow up', icon: Calendar },
];

const homeownerQuickActions = [
  { id: 'find-pro', label: 'Find a pro', icon: Wrench },
  { id: 'estimate', label: 'Get estimate', icon: DollarSign },
  { id: 'requests', label: 'My active requests', icon: HomeIcon },
];

export function AIChatModal({ open, onOpenChange, userRole = 'provider' }: AIChatModalProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const quickActions = userRole === 'provider' ? providerQuickActions : homeownerQuickActions;

  const handleQuickAction = (actionId: string) => {
    const prompts: Record<string, string> = {
      'unpaid': 'Show me all unpaid invoices',
      'revenue': "What's my revenue this week?",
      'followup': 'Who should I follow up with?',
      'find-pro': 'I need to find a plumber',
      'estimate': 'Get me a price estimate for lawn care',
      'requests': 'Show my active service requests'
    };
    
    setSelectedPrompt(prompts[actionId] || null);
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-gradient-to-b from-primary/5 via-background to-primary/10
                 flex items-center justify-center p-0"
    >
      {/* Backdrop - click to close */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Main Content Container */}
      <div 
        className="relative w-full h-full bg-background flex flex-col overflow-hidden z-10 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 
                          flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            
            {/* Text */}
            <div>
              <h3 className="font-semibold text-base">HomeBase AI</h3>
              <p className="text-xs text-muted-foreground">
                {userRole === 'provider' ? 'Business Assistant' : 'Your Home Assistant'}
              </p>
            </div>
          </div>
          
          {/* Status & Actions */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
              Online
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pt-3 pb-2 border-b border-border/50 bg-muted/20">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap bg-card hover:bg-primary/5 
                           hover:border-primary/30 transition-all active:scale-95"
                  onClick={() => handleQuickAction(action.id)}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <HomeBaseAI 
            userRole={userRole} 
            autoFocus={true}
            triggerPrompt={selectedPrompt}
            onPromptTriggered={() => setSelectedPrompt(null)}
          />
        </div>
      </div>
    </div>
  );
}
