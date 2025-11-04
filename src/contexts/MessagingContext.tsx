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
  homeowner_profile_id?: string;
  provider_org_id?: string;
  members: ConversationMember[];
  otherMember?: {
    full_name: string;
    avatar_url?: string;
  };
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
  totalUnread: number;
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
  const [totalUnread, setTotalUnread] = useState(0);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Record<string, RealtimeChannel>>({});
  
  // Get user profile on mount
  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setUserProfileId(null);
          setLoading(false);
          return;
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        setUserProfileId(profile?.id || null);
      } catch (error) {
        console.error('Error getting user profile:', error);
        setUserProfileId(null);
      } finally {
        setLoading(false);
      }
    };
    getProfile();
  }, []);
  
  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userProfileId) {
      setLoading(false);
      return;
    }
    
    // Guard: only fetch if authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    
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
            last_message_preview,
            homeowner_profile_id,
            provider_org_id
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
          homeowner_profile_id: item.conversations.homeowner_profile_id,
          provider_org_id: item.conversations.provider_org_id,
          members: [],
          last_read_at: item.last_read_at
        }));
        
        // Fetch other members' profiles for each conversation
        for (const convo of convos) {
          // Guard: skip if no session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) continue;
          
          // First, get the other member's profile_id (removed status filter to include NULL)
          const { data: member, error: memberError } = await supabase
            .from('conversation_members')
            .select('profile_id')
            .eq('conversation_id', convo.id)
            .neq('profile_id', userProfileId)
            .limit(1)
            .maybeSingle();
          
          if (memberError && memberError.code !== 'PGRST116') {
            console.error('Error fetching member:', memberError);
          }
          
          if (member?.profile_id) {
            // Then fetch the profile data separately
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', member.profile_id)
              .single();
            
            if (!profileError && profileData) {
              convo.otherMember = {
                full_name: profileData.full_name,
                avatar_url: profileData.avatar_url
              };
            }
          }
          
          // Fallback: use conversation metadata if other member not found
          if (!convo.otherMember) {
            if (userProfileId === (convo as any).homeowner_profile_id) {
              // Current user is homeowner, fetch provider org
              const { data: org } = await supabase
                .from('organizations')
                .select('name, logo_url')
                .eq('id', (convo as any).provider_org_id)
                .single();
              
              if (org) {
                convo.otherMember = {
                  full_name: org.name,
                  avatar_url: org.logo_url
                };
              }
            } else {
              // Current user is provider, fetch homeowner profile
              const { data: homeowner } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', (convo as any).homeowner_profile_id)
                .single();
              
              if (homeowner) {
                convo.otherMember = {
                  full_name: homeowner.full_name,
                  avatar_url: homeowner.avatar_url
                };
              }
            }
          }
        }
        
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
        
        // Calculate total unread
        const total = Object.values(unreads).reduce((sum, count) => sum + count, 0);
        setTotalUnread(total);
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
      console.log('Sending message via RPC:', { conversationId, content, messageType });
      
      const { data, error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_sender_profile_id: userProfileId,
        p_content: content,
        p_message_type: messageType,
        p_meta: meta || {},
        p_attachment_url: meta?.url || null
      });
      
      if (error) {
        console.error('Send message error:', error);
        toast.error('Failed to send message');
        throw error;
      }
      
      console.log('Message sent successfully:', data);
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
      
      // Update local state immediately
      setUnreadCounts(prev => {
        const updated = { ...prev, [conversationId]: 0 };
        // Recalculate total
        const newTotal = Object.values(updated).reduce((sum, count) => sum + count, 0);
        setTotalUnread(newTotal);
        return updated;
      });
      
      // Trigger realtime update for other devices
      await supabase.from('conversations')
        .update({ 
          updated_at: new Date().toISOString() 
        })
        .eq('id', conversationId);
        
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
        totalUnread,
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
