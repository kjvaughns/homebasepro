import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Home, DollarSign, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: any[];
}

interface AIAssistantProps {
  sessionId?: string;
  context?: {
    homeId?: string;
    serviceType?: string;
  };
  onPropertyFound?: (property: any) => void;
  onPriceGenerated?: (estimate: any) => void;
}

export default function AIAssistant({ 
  sessionId: initialSessionId,
  context,
  onPropertyFound,
  onPriceGenerated 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const { toast } = useToast();
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
        throw new Error('Please sign in to use the assistant');
      }

      const token = authData.session.access_token;

      const { data, error } = await supabase.functions.invoke('assistant', {
        body: {
          session_id: sessionId,
          message: userMsg.content,
          history: messages.map(m => ({ role: m.role, content: m.content })).slice(-15),
          context
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

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      // Trigger callbacks
      if (data.tool_results) {
        data.tool_results.forEach((result: any) => {
          if (result.type === 'property' && onPropertyFound) {
            onPropertyFound(result.data);
          }
          if (result.type === 'price' && onPriceGenerated) {
            onPriceGenerated(result.data);
          }
        });
      }

    } catch (error) {
      console.error('AI Assistant error:', error);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">HomeBase AI Assistant</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                I can help you with:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Looking up property details from an address
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Getting instant price estimates for services
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2 rounded-full ${msg.role === 'user' ? 'bg-primary' : 'bg-muted'}`}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-2">
                <div className={`rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {msg.toolResults?.map((result, idx) => (
                  <div key={idx}>
                    {result.type === 'property' && (
                      <Card className="border-blue-200">
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
                            {result.data.home?.lot_acres && (
                              <div>
                                <p className="text-muted-foreground">Lot Size</p>
                                <p className="font-medium">
                                  {result.data.home.lot_acres} acres
                                </p>
                              </div>
                            )}
                            {result.data.home?.year_built && (
                              <div>
                                <p className="text-muted-foreground">Year Built</p>
                                <p className="font-medium">{result.data.home.year_built}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {result.type === 'price' && (
                      <Card className="border-green-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              {result.data.service}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(result.data.confidence * 100)}% confidence
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                              {result.data.units} {result.data.unit_type}
                            </span>
                            {result.data.base_per_unit > 0 && (
                              <span>
                                {result.data.units} × ${result.data.base_per_unit} = 
                                ${(result.data.units * result.data.base_per_unit).toFixed(0)}
                              </span>
                            )}
                          </div>

                          {result.data.multiplier_product !== 1 && (
                            <>
                              <Separator />
                              <div className="space-y-1">
                                {Object.entries(result.data.multipliers_applied).map(([key, val]) => {
                                  const value = val as number;
                                  if (value === 1) return null;
                                  return (
                                    <div key={key} className="flex justify-between">
                                      <span className="capitalize">{key.replace('_', ' ')}</span>
                                      <span className="text-primary">×{value.toFixed(2)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}

                          <Separator />
                          
                          <div className="flex justify-between items-center text-base font-bold">
                            <span>Estimate</span>
                            <span className="text-xl text-primary">
                              ${result.data.estimate}
                            </span>
                          </div>
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
              <div className="rounded-lg p-3 bg-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about property details or service pricing..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Try: "123 Main St, Jackson MS" or "How much for lawn mowing?"
        </p>
      </div>
    </div>
  );
}
