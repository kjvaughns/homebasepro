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
}

export default function HomeBaseAI({ 
  sessionId: initialSessionId,
  context,
  onServiceRequestCreated 
}: HomeBaseAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      const { data, error } = await supabase.functions.invoke('assistant', {
        body: {
          session_id: sessionId,
          message: userMsg.content,
          context
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

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
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
                  <p className="text-sm text-muted-foreground">Your smart home assistant</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                I can help you with:
              </p>
              <div className="grid gap-3">
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

      <div className="border-t p-3 sm:p-4 bg-background safe-bottom">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your home problem..."
            disabled={isLoading}
            className="flex-1 h-11 sm:h-10 text-base"
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
          Try: "My AC is blowing warm air" or "Need lawn mowing"
        </p>
      </div>
    </div>
  );
}