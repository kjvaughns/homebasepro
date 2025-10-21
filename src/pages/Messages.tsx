import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Search, MoreHorizontal, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { AIActionStrip } from "@/components/messages/AIActionStrip";
import { TypingIndicator } from "@/components/messages/TypingIndicator";

export default function Messages() {
  const location = useLocation();
  const isConversationView = location.pathname.includes('/messages/') && location.pathname.split('/').length > 2;
  
  return (
    <div className="flex h-full w-full bg-background">
      {/* Inbox - hidden on mobile when viewing conversation */}
      <div className={`${isConversationView ? 'hidden' : 'flex'} md:flex md:w-[360px] md:border-r border-border flex-col h-full`}>
        <MessagesInbox />
      </div>
      
      {/* Conversation - shown when route matches */}
      <div className={`${isConversationView ? 'flex' : 'hidden'} md:flex flex-1 min-w-0`}>
        {isConversationView ? <ConversationView /> : <EmptyConversationState />}
      </div>
    </div>
  );
}

function MessagesInbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(prof);
    })();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    
    const loadConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select(`
          id,
          kind,
          title,
          job_id,
          created_at,
          last_message_at,
          last_message_preview,
          conversation_members!inner(profile_id, last_read_at)
        `)
        .eq("conversation_members.profile_id", profile.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      
      setConversations(data || []);
    };
    
    loadConversations();
    
    // Subscribe to changes
    const channel = supabase
      .channel('inbox-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, loadConversations)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadConversations)
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const filtered = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => 
      (c.title || '').toLowerCase().includes(q) ||
      (c.last_message_preview || '').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3 space-y-3">
        <h1 className="text-xl font-semibold">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        )}
        
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => navigate(`/messages/${conv.id}`)}
            className="w-full text-left p-4 hover:bg-muted/50 border-b border-border last:border-0 transition-colors active:bg-muted"
          >
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary">
                  {(conv.title || 'Chat')[0].toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-medium truncate text-sm">
                    {conv.title || labelForConversation(conv)}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatTimestamp(conv.last_message_at || conv.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {conv.last_message_preview || 'No messages yet'}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function ConversationView() {
  const navigate = useNavigate();
  const location = useLocation();
  const conversationId = location.pathname.split('/').pop();
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(prof);
    })();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    
    const loadConversation = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      setConversation(data);
    };
    
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      
      // Mark as read - update conversation_members directly
      if (profile?.id) {
        const { error } = await supabase
          .from("conversation_members" as any)
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("profile_id", profile.id);
        
        if (error) console.log('Read receipt update failed:', error);
      }
    };
    
    loadMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'typing_states',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload: any) => {
        if (payload.new.is_typing && payload.new.profile_id !== profile?.id) {
          setTypingUsers(prev => [...new Set([...prev, payload.new.profile_id])]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== payload.new.profile_id));
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, profile?.id]);

  // Auto-scroll on mount and new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (content: string, type: string = 'text', meta?: any) => {
    if (!conversationId || !profile?.id) return;
    
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_profile_id: profile.id,
      sender_type: profile.user_type,
      content: type === 'text' ? content : null,
      message_type: type,
      meta: meta || {},
      attachment_url: meta?.url || null,
      attachment_metadata: meta || {}
    });
    
    // Update conversation last message
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: type === 'text' ? content.slice(0, 100) : `Sent ${type}`
    }).eq("id", conversationId);
  };

  const handleTyping = async (isTyping: boolean) => {
    if (!conversationId || !profile?.id) return;
    
    const { error } = await supabase
      .from("typing_states" as any)
      .upsert({
        conversation_id: conversationId,
        profile_id: profile.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      });
    
    if (error) console.log('Typing indicator update failed:', error);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-3 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">
            {conversation?.title || labelForConversation(conversation)}
          </p>
          {conversation?.kind === 'job' && (
            <p className="text-xs text-muted-foreground truncate">
              Job conversation
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
        {messages.map((msg, idx) => {
          const showDateSeparator = idx === 0 || 
            !isSameDay(new Date(messages[idx - 1].created_at), new Date(msg.created_at));
          
          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isSender={msg.sender_profile_id === profile?.id}
              />
            </div>
          );
        })}
        
        {typingUsers.length > 0 && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* AI Action Strip */}
      <AIActionStrip conversationId={conversationId!} onSendMessage={handleSendMessage} />

      {/* Composer */}
      <MessageComposer
        conversationId={conversationId!}
        profileId={profile?.id}
        onSend={handleSendMessage}
        onTyping={handleTyping}
      />
      
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] md:h-0 bg-background" />
    </div>
  );
}

function EmptyConversationState() {
  return (
    <div className="hidden md:flex h-full w-full items-center justify-center p-6">
      <div className="text-center space-y-2 max-w-md">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Select a conversation</h3>
        <p className="text-sm text-muted-foreground">
          Choose a conversation from the list to view messages
        </p>
      </div>
    </div>
  );
}

// Helper functions
function labelForConversation(conv: any) {
  if (!conv) return 'Conversation';
  if (conv.kind === 'job') return conv.title || 'Job Chat';
  if (conv.kind === 'group') return conv.title || 'Group';
  return 'Direct Message';
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d`;
  return date.toLocaleDateString();
}

function formatDateSeparator(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}