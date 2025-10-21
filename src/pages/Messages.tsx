import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessaging } from '@/contexts/MessagingContext';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { ConversationListItem } from '@/components/messages/ConversationListItem';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { DateSeparator } from '@/components/messages/DateSeparator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Video, Info, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSameDay } from 'date-fns';

interface MessagesProps {
  role: 'homeowner' | 'provider';
}

export default function Messages({ role }: MessagesProps) {
  const isHomeowner = role === 'homeowner';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  
  const {
    conversations,
    messages,
    typingUsers,
    unreadCounts,
    userProfileId,
    loading,
    loadMessages,
    sendMessage,
    markAsRead,
    setTyping
  } = useMessaging();
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdFromUrl);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl]);
  
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      markAsRead(selectedConversationId);
      setSearchParams({ conversation: selectedConversationId });
    } else {
      setSearchParams({});
    }
  }, [selectedConversationId, loadMessages, markAsRead, setSearchParams]);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[selectedConversationId || '']]);
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const conversationMessages = messages[selectedConversationId || ''] || [];
  const typingInConversation = typingUsers[selectedConversationId || ''] || [];
  
  // Get conversation display name
  const getConversationName = (convo: typeof selectedConversation) => {
    if (!convo) return 'Conversation';
    if (convo.title) return convo.title;
    if (convo.otherMember?.full_name) return convo.otherMember.full_name;
    return isHomeowner ? 'Provider' : 'Homeowner';
  };
  
  const getConversationAvatar = (convo: typeof selectedConversation) => {
    if (!convo) return '';
    return convo.otherMember?.avatar_url || '';
  };
  
  // Mobile: Show conversation list OR messages view
  const isMobile = window.innerWidth < 768;
  const showConversationList = !selectedConversationId || !isMobile;
  const showMessagesView = selectedConversationId;
  
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };
  
  const handleBackToList = () => {
    setSelectedConversationId(null);
  };
  
  const handleSendMessage = async (content: string, messageType?: string, meta?: any) => {
    if (!selectedConversationId) return;
    await sendMessage(selectedConversationId, content, messageType, meta);
  };
  
  const handleTyping = (isTyping: boolean) => {
    if (!selectedConversationId) return;
    setTyping(selectedConversationId, isTyping);
  };
  
  // Render messages with date separators
  const renderMessages = () => {
    const elements: JSX.Element[] = [];
    
    conversationMessages.forEach((msg, index) => {
      const prevMsg = index > 0 ? conversationMessages[index - 1] : null;
      const showDateSeparator = !prevMsg || !isSameDay(
        new Date(msg.created_at),
        new Date(prevMsg.created_at)
      );
      
      if (showDateSeparator) {
        elements.push(
          <DateSeparator key={`date-${msg.id}`} date={new Date(msg.created_at)} />
        );
      }
      
      elements.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          isSender={msg.sender_profile_id === userProfileId}
        />
      );
    });
    
    return elements;
  };
  
  const containerHeight = isHomeowner 
    ? 'h-[calc(100dvh-56px)]' 
    : 'h-[calc(100dvh-64px)]';
  
  if (loading) {
    return (
      <div className={cn("flex bg-background", containerHeight)}>
        <div className="w-full md:w-80 lg:w-96 border-r flex flex-col bg-muted/30">
          <div className="border-b p-4 bg-card/95">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("flex bg-background", containerHeight)}>
      {/* Conversation List */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r flex flex-col bg-muted/30",
          !showConversationList && "hidden md:flex"
        )}
      >
        <div className="border-b p-4 bg-card/95 backdrop-blur">
          <h2 className="font-bold text-xl">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-sm">
                Start a conversation with a provider or homeowner
              </p>
            </div>
          ) : (
            conversations.map(convo => (
              <ConversationListItem
                key={convo.id}
                name={getConversationName(convo)}
                lastMessage={convo.last_message_preview || 'No messages yet'}
                lastMessageAt={convo.last_message_at}
                unreadCount={unreadCounts[convo.id] || 0}
                avatarUrl={getConversationAvatar(convo)}
                isSelected={convo.id === selectedConversationId}
                onClick={() => handleConversationSelect(convo.id)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Messages View */}
      <div
        className={cn(
          "flex-1 flex flex-col relative",
          !showMessagesView && "hidden md:flex"
        )}
      >
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b p-4 bg-card/95 backdrop-blur flex items-center gap-3 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="h-11 w-11">
                <AvatarImage src={getConversationAvatar(selectedConversation)} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {getConversationName(selectedConversation)[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">
                  {getConversationName(selectedConversation)}
                </h2>
                {typingInConversation.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    typing...
                  </p>
                )}
              </div>
              
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Messages */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10"
              style={{
                paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))'
              }}
            >
              {renderMessages()}
              
              {typingInConversation.length > 0 && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Composer */}
            <MessageComposer
              conversationId={selectedConversationId}
              profileId={userProfileId || ''}
              onSend={handleSendMessage}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
