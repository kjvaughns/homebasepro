import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface Message {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  content: string;
  message_type: string;
  created_at: string;
  attachment_url?: string;
  meta?: any;
}

interface ConversationMember {
  profile_id: string;
  last_read_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  kind: string;
  title?: string;
  last_message_at?: string;
  last_message_preview?: string;
  members: ConversationMember[];
}

interface TypingState {
  profile_id: string;
  profile?: {
    full_name: string;
  };
}

interface MessagingContextValue {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingState[]>;
  unreadCounts: Record<string, number>;
  userProfileId: string | null;
  loading: boolean;
  
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, messageType?: string, meta?: any) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) throw new Error('useMessaging must be used within MessagingProvider');
  return context;
};

export const MessagingProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingState[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Record<string, RealtimeChannel>>({});
  
  // Get user profile on mount
  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          setUserProfileId(profile?.id || null);
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
    };
    getProfile();
  }, []);
  
  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userProfileId) return;
    
    try {
      setLoading(true);
      console.log('Loading conversations for profile:', userProfileId);
      
      const { data: memberData, error: memberError } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          last_read_at,
          conversations!inner(
            id,
            kind,
            title,
            last_message_at,
            last_message_preview
          )
        `)
        .eq('profile_id', userProfileId)
        .eq('status', 'active');
      
      if (memberError) {
        console.error('Error loading conversations:', memberError);
        toast.error('Failed to load conversations');
        return;
      }
      
      if (memberData) {
        // Transform data
        const convos: Conversation[] = memberData.map((item: any) => ({
          id: item.conversations.id,
          kind: item.conversations.kind,
          title: item.conversations.title,
          last_message_at: item.conversations.last_message_at,
          last_message_preview: item.conversations.last_message_preview,
          members: [],
          last_read_at: item.last_read_at
        }));
        
        // Sort by last_message_at
        convos.sort((a, b) => {
          const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return dateB - dateA;
        });
        
        setConversations(convos);
        
        // Calculate unread counts
        const unreads: Record<string, number> = {};
        for (const item of memberData) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', item.conversations.id)
            .neq('sender_profile_id', userProfileId)
            .gt('created_at', item.last_read_at);
          unreads[item.conversations.id] = count || 0;
        }
        setUnreadCounts(unreads);
      }
    } catch (error) {
      console.error('Error in loadConversations:', error);
    } finally {
      setLoading(false);
    }
  }, [userProfileId]);
  
  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
        return;
      }
      
      if (data) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: data
        }));
      }
      
      // Subscribe to realtime updates if not already subscribed
      if (!channels[conversationId]) {
        const channel = supabase
          .channel(`conversation:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`
            },
            (payload) => {
              console.log('New message received:', payload);
              setMessages(prev => ({
                ...prev,
                [conversationId]: [...(prev[conversationId] || []), payload.new as Message]
              }));
              
              // Refresh conversations to update preview
              loadConversations();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'typing_states',
              filter: `conversation_id=eq.${conversationId}`
            },
            (payload) => {
              const newData = payload.new as any;
              if (!newData || newData.profile_id === userProfileId) return;
              
              if (newData.is_typing) {
                setTypingUsers(prev => {
                  const current = prev[conversationId] || [];
                  const exists = current.find(u => u.profile_id === newData.profile_id);
                  if (!exists) {
                    return {
                      ...prev,
                      [conversationId]: [...current, { profile_id: newData.profile_id }]
                    };
                  }
                  return prev;
                });
              } else {
                setTypingUsers(prev => ({
                  ...prev,
                  [conversationId]: (prev[conversationId] || []).filter(
                    u => u.profile_id !== newData.profile_id
                  )
                }));
              }
            }
          )
          .subscribe();
        
        setChannels(prev => ({ ...prev, [conversationId]: channel }));
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  }, [channels, userProfileId, loadConversations]);
  
  // Send message
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    messageType = 'text',
    meta?: any
  ) => {
    if (!userProfileId) return;
    
    try {
      console.log('Sending message:', { conversationId, content, messageType });
      
      const messageData: any = {
        conversation_id: conversationId,
        sender_profile_id: userProfileId,
        content,
        message_type: messageType,
        sender_type: 'user',
        meta: meta || {}
      };
      
      const { error } = await supabase
        .from('messages')
        .insert(messageData);
      
      if (error) {
        console.error('Send message error:', error);
        toast.error('Failed to send message');
        throw error;
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [userProfileId]);
  
  // Mark as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!userProfileId) return;
    
    try {
      const { error } = await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('profile_id', userProfileId);
      
      if (error) {
        console.error('Error marking as read:', error);
        return;
      }
      
      setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }));
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }, [userProfileId]);
  
  // Set typing indicator
  const setTyping = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!userProfileId) return;
    
    try {
      const { error } = await supabase
        .from('typing_states')
        .upsert({
          conversation_id: conversationId,
          profile_id: userProfileId,
          is_typing: isTyping,
          last_typed_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error setting typing state:', error);
      }
    } catch (error) {
      console.error('Error in setTyping:', error);
    }
  }, [userProfileId]);
  
  // Cleanup channels on unmount
  useEffect(() => {
    return () => {
      Object.values(channels).forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [channels]);
  
  // Load conversations when profile is available
  useEffect(() => {
    if (userProfileId) {
      loadConversations();
    }
  }, [userProfileId, loadConversations]);
  
  return (
    <MessagingContext.Provider
      value={{
        conversations,
        messages,
        typingUsers,
        unreadCounts,
        userProfileId,
        loading,
        loadConversations,
        loadMessages,
        sendMessage,
        markAsRead,
        setTyping
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
};
