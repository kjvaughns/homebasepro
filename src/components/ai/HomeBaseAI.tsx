import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Home, DollarSign, CheckCircle2, AlertCircle, Star, Share2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProviderCard } from '@/components/marketplace/ProviderCard';
import { BookingDialog } from '@/components/marketplace/BookingDialog';
import { AIComposer } from './AIComposer';
import { AIEscalateButton } from './AIEscalateButton';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useDespia } from '@/hooks/useDespia';
import { SmartTypingIndicator } from './SmartTypingIndicator';
import { ActionCard } from './ActionCard';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: any[];
}

interface HomeBaseAIProps {
  sessionId?: string;
  context?: {
    homeId?: string;
    serviceType?: string;
  };
  onServiceRequestCreated?: (request: any) => void;
  onSessionChange?: (sessionId: string) => void;
  userRole?: 'homeowner' | 'provider';
  autoFocus?: boolean;
  triggerPrompt?: string | null;
  onPromptTriggered?: () => void;
}

export default function HomeBaseAI({ 
  sessionId: initialSessionId,
  context,
  onServiceRequestCreated,
  onSessionChange,
  userRole = 'homeowner',
  autoFocus = false,
  triggerPrompt,
  onPromptTriggered
}: HomeBaseAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [currentServiceType, setCurrentServiceType] = useState<string>('');
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [defaultProperty, setDefaultProperty] = useState<any>(null);
  const [composerHeight, setComposerHeight] = useState(80);
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const keyboardHeight = useKeyboardHeight();
  const { triggerHaptic, showSpinner, hideSpinner, shareContent } = useDespia();

  const isProvider = userRole === 'provider';

  // Load chat history when session ID is available
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setHistoryLoaded(false);
      return;
    }
    
    if (historyLoaded) return;

    const loadHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_chat_messages')
          .select('role, content')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          console.error('Error loading chat history:', error);
          return;
        }

        if (data && data.length > 0) {
          setMessages(data.map((msg, idx) => ({
            id: `history-${idx}`,
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
        }
        
        setHistoryLoaded(true);
      } catch (err) {
        console.error('Failed to load history:', err);
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [sessionId, historyLoaded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, keyboardHeight, composerHeight]);

  // Handle triggered prompts from quick actions
  useEffect(() => {
    if (triggerPrompt && !isLoading) {
      sendMessage(triggerPrompt);
      onPromptTriggered?.();
    }
  }, [triggerPrompt]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    triggerHaptic('light');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    showSpinner();

    try {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('Please sign in to use HomeBase AI');
      }

      const token = authData.session.access_token;

      // Get user profile to determine role
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user?.id)
        .single();

      const enrichedContext = {
        ...context,
        role: profile?.user_type || 'homeowner',
        last_route: window.location.pathname,
        prefer_default_property: true
      };

      // Route to correct assistant based on role
      const functionName = isProvider ? 'assistant-provider' : 'assistant';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          session_id: sessionId,
          message: userMsg.content,
          history: messages.map(m => ({ role: m.role, content: m.content })).slice(-15),
          context: enrichedContext
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        toolResults: data.tool_results
      };

      setMessages(prev => [...prev, assistantMsg]);
      triggerHaptic('success');

      if (data.session_id) {
        const newSessionId = data.session_id;
        setSessionId(newSessionId);
        
        // Persist session ID
        if (newSessionId !== sessionId && onSessionChange) {
          onSessionChange(newSessionId);
        }
      }

      // Trigger callbacks
      if (data.tool_results) {
        data.tool_results.forEach((result: any) => {
          if (result.type === 'service_request' && onServiceRequestCreated) {
            onServiceRequestCreated(result.data);
          }
        });
      }

    } catch (error) {
      console.error('HomeBase AI error:', error);
      triggerHaptic('error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'text-destructive';
      case 'moderate': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'moderate': return <AlertCircle className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const handleBookProvider = (provider: any) => {
    triggerHaptic('light');
    setSelectedProvider(provider);
    setCurrentServiceType(context?.serviceType || 'Service');
    setBookingDialogOpen(true);
  };

  const handleBookingSuccess = () => {
    triggerHaptic('success');
    toast({
      title: "Booking Requested",
      description: "The provider will confirm your appointment shortly.",
    });
    navigate('/homeowner/appointments');
  };

  const handleShareConversation = () => {
    triggerHaptic('light');
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'You' : 'HomeBase AI'}: ${m.content}`)
      .join('\n\n');
    shareContent(conversationText);
  };

  const renderToolResult = (tr: any) => {
    if (tr.tool === 'lookup_home' && tr.result) {
      return <Card className="p-3 bg-accent/10"><p className="text-sm font-medium">{tr.result.address_std}</p></Card>;
    }
    if (tr.tool === 'price_service' && tr.result) {
      return <Card className="p-3 bg-accent/10"><p className="text-lg font-bold">${tr.result.estimate_low}–${tr.result.estimate_high}</p></Card>;
    }
    return null;
  };

  const formatMessageTime = (index: number) => {
    if (index === messages.length - 1) return 'Just now';
    const minutesAgo = messages.length - index;
    return minutesAgo < 60 ? `${minutesAgo}m ago` : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="flex flex-col h-full relative">
      <div 
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-4 p-3 sm:p-4 touch-manipulation"
        style={{
          overflowAnchor: 'none',
          paddingBottom: `${composerHeight + keyboardHeight + 16}px`,
        }}
      >
        {/* Welcome/Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center min-h-full py-8">
            <div className="max-w-md text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br 
                            from-primary to-primary/80 flex items-center justify-center
                            shadow-2xl">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Hi! I'm your HomeBase AI assistant
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isProvider 
                    ? "I can help with invoices, scheduling, business insights, and more."
                    : "I can help you find pros, get estimates, and manage your home services."}
                </p>
              </div>
              
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Try asking:
                </p>
                {[
                  isProvider ? "Show me unpaid invoices" : "Find me a plumber",
                  isProvider ? "What's my revenue this week?" : "Get a price estimate",
                  isProvider ? "Who should I follow up with?" : "Show my service requests"
                ].map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4
                             hover:bg-primary/5 hover:border-primary/30"
                    onClick={() => sendMessage(prompt)}
                  >
                    <Star className="w-4 h-4 mr-2 text-primary shrink-0" />
                    <span className="text-sm">{prompt}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1 px-1">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-primary/80 
                                flex items-center justify-center shadow">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">HomeBase AI</span>
                </div>
              )}
              
              <div className={`
                ${msg.role === 'user' 
                  ? 'bg-primary/10 border-primary/20 rounded-2xl rounded-br-md' 
                  : 'bg-card border-border rounded-2xl rounded-bl-md'
                } 
                border p-3.5 shadow-sm
              `}>
                <div className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'text-foreground' : 'text-card-foreground'}`}>
                  {msg.content}
                </div>
              </div>
              
              <span className="text-xs text-muted-foreground px-1">
                {formatMessageTime(index)}
              </span>
              {/* Tool Results */}
              <div className="mt-2 space-y-2 w-full">
              {msg.toolResults?.map((result, idx) => (
                <div key={idx}>
                  {result.type === 'property' && (
                      <Card className="border-primary/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            Property Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-muted-foreground">Address</p>
                              <p className="font-medium">{result.data.address_std}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">ZIP</p>
                              <p className="font-medium">{result.data.zip}</p>
                            </div>
                            {result.data.home?.beds && (
                              <div>
                                <p className="text-muted-foreground">Beds/Baths</p>
                                <p className="font-medium">
                                  {result.data.home.beds} / {result.data.home.baths}
                                </p>
                              </div>
                            )}
                            {result.data.home?.sqft && (
                              <div>
                                <p className="text-muted-foreground">Square Feet</p>
                                <p className="font-medium">
                                  {result.data.home.sqft.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {result.type === 'service_request' && (
                      <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                              <CardTitle className="text-base">Service Request Created</CardTitle>
                            </div>
                            <Badge className={getSeverityColor(result.data.severity)}>
                              {result.data.severity}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-1">Summary</p>
                            <p className="text-sm text-muted-foreground">{result.data.summary}</p>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Estimated Cost</span>
                            <span className="text-lg font-bold text-primary">
                              {result.data.cost_range}
                            </span>
                          </div>

                          {result.data.matched_count > 0 && (
                            <>
                              <Separator />
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <Star className="w-4 h-4 text-primary" />
                                  {result.data.matched_count} Trusted Providers Found
                                </p>
                                <div className="space-y-2">
                                  {result.data.providers.slice(0, 3).map((provider: any, pidx: number) => (
                                    <div key={pidx} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50">
                                      <div>
                                        <p className="text-sm font-medium">{provider.organizations.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          ⭐ {provider.provider_metrics?.trust_score?.toFixed(1) || '5.0'} Trust Score
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          <Button 
                            className="w-full"
                            onClick={() => navigate(`/homeowner/requests/${result.data.request_id}`)}
                          >
                            View Full Details
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {result.type === 'providers' && result.data?.providers && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary" />
                          {result.data.providers.length} Provider{result.data.providers.length !== 1 ? 's' : ''} Available
                        </p>
                        <div className="grid gap-3">
                          {result.data.providers.map((provider: any) => (
                            <ProviderCard
                              key={provider.provider_id}
                              provider={provider}
                              onBook={(providerId) => handleBookProvider(provider)}
                              onViewProfile={(providerId) => navigate(`/homeowner/browse/${providerId}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <SmartTypingIndicator message="Thinking..." />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Show escalation after 3+ messages */}
      {messages.length >= 6 && (
        <AIEscalateButton 
          conversationContext={messages.map(m => ({ role: m.role, content: m.content }))}
          reason="conversation_length"
        />
      )}

      {/* Booking Dialog */}
      {selectedProvider && defaultProperty && (
        <BookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          provider={selectedProvider}
          serviceType={currentServiceType}
          defaultProperty={defaultProperty}
          estimatedPrice={currentEstimate}
          onSuccess={handleBookingSuccess}
        />
      )}

      {messages.length > 0 && (
        <div className="px-3 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareConversation}
            className="w-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Conversation
          </Button>
        </div>
      )}

      <AIComposer
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={isProvider ? "Ask about your business..." : "Describe your home problem..."}
        onHeightChange={setComposerHeight}
      />
    </div>
  );
}