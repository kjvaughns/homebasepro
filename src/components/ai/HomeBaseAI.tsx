import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Home, DollarSign, Loader2, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProviderCard } from '@/components/marketplace/ProviderCard';
import { BookingDialog } from '@/components/marketplace/BookingDialog';

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
}

export default function HomeBaseAI({ 
  sessionId: initialSessionId,
  context,
  onServiceRequestCreated,
  onSessionChange,
  userRole = 'homeowner',
  autoFocus = false
}: HomeBaseAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [currentServiceType, setCurrentServiceType] = useState<string>('');
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [defaultProperty, setDefaultProperty] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isProvider = userRole === 'provider';

  // Load chat history when session ID is available
  useEffect(() => {
    if (!sessionId || historyLoaded) return;

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
  }, [messages]);

  // Auto-focus input when autoFocus prop changes
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

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
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
    setSelectedProvider(provider);
    setCurrentServiceType(context?.serviceType || 'Service');
    setBookingDialogOpen(true);
  };

  const handleBookingSuccess = () => {
    toast({
      title: "Booking Requested",
      description: "The provider will confirm your appointment shortly.",
    });
    navigate('/homeowner/appointments');
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

  return (
    <div className="flex flex-col h-full touch-manipulation">
      <div className="flex-1 overflow-y-auto space-y-4 p-3 sm:p-4">
        {messages.length === 0 && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary rounded-xl shadow-lg">
                  <Bot className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">HomeBase AI</h3>
                  <p className="text-sm text-muted-foreground">
                    {isProvider ? 'Your business assistant' : 'Your smart home assistant'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                I can help you with:
              </p>
              <div className="grid gap-3">
                {isProvider ? (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <Home className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Job Prioritization</p>
                        <p className="text-xs text-muted-foreground">Optimize your daily schedule</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Quote Assistance</p>
                        <p className="text-xs text-muted-foreground">Get pricing recommendations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <Star className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Business Insights</p>
                        <p className="text-xs text-muted-foreground">Track performance metrics</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <Home className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Describe any home problem</p>
                        <p className="text-xs text-muted-foreground">AC issues, leaks, lawn care needs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Get instant price estimates</p>
                        <p className="text-xs text-muted-foreground">Fair, transparent pricing ranges</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <Star className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Match with trusted pros</p>
                        <p className="text-xs text-muted-foreground">Top-rated local providers</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2 rounded-full flex-shrink-0 ${
                msg.role === 'user' ? 'bg-primary' : 'bg-muted'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-3">
                <div className={`rounded-2xl p-3 sm:p-4 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                
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
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="p-2 rounded-full bg-muted">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl p-4 bg-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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

      <div className="border-t p-3 sm:p-4 bg-background safe-bottom">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isProvider ? "Ask about your business..." : "Describe your home problem..."}
            disabled={isLoading}
            className="flex-1 h-11 sm:h-10 text-base"
            inputMode="text"
            enterKeyHint="send"
            autoCapitalize="sentences"
            autoCorrect="on"
            autoComplete="off"
            autoFocus={autoFocus}
            style={{ touchAction: 'manipulation' }}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-full h-11 w-11 sm:h-10 sm:w-10 active:scale-95 transition-transform"
          >
            <Send className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isProvider 
            ? 'Try: "What should I work on today?" or "Help me quote an HVAC job"'
            : 'Try: "My AC is blowing warm air" or "Need lawn mowing"'}
        </p>
      </div>
    </div>
  );
}