import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, ArrowDown, X, ArrowLeft } from "lucide-react";
import { isSameDay } from "date-fns";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { DateSeparator } from "@/components/messages/DateSeparator";
import { AttachmentButton } from "@/components/messages/AttachmentButton";
import { ConversationListItem } from "@/components/messages/ConversationListItem";
import { uploadMessageAttachment } from "@/utils/fileUpload";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function ProviderMessages() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    file: File;
    type: 'image' | 'file';
    preview?: string;
  } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  useEffect(() => {
    scrollToBottom("auto");
    inputRef.current?.focus();
  }, [messages, selectedConversation]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      const cleanup = subscribeToMessages(selectedConversation.id);
      return cleanup;
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (!org) {
        setLoading(false);
        return;
      }

      const { data: convos, error } = await supabase
        .from("conversations")
        .select(`
          *,
          profiles:homeowner_profile_id(full_name)
        `)
        .eq("provider_org_id", org.id)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      setConversations(convos || []);
      if (convos && convos.length > 0) {
        setSelectedConversation(convos[0]);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(messagesData || []);

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "homeowner");

    await supabase.rpc("reset_unread_count", {
      conv_id: conversationId,
      user_type: "provider",
    });
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFileSelect = (file: File, type: 'image' | 'file') => {
    if (type === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview({
          file,
          type,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview({ file, type });
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachmentPreview) || !selectedConversation || uploading || !userProfile) return;

    try {
      setUploading(true);
      let attachmentUrl = null;
      let attachmentMetadata = null;
      let messageType = 'text';

      if (attachmentPreview) {
        const uploaded = await uploadMessageAttachment(
          attachmentPreview.file,
          selectedConversation.id
        );
        attachmentUrl = uploaded.path;
        attachmentMetadata = uploaded.metadata;
        messageType = attachmentPreview.type;
      }

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_profile_id: userProfile.id,
        sender_type: "provider",
        content: newMessage,
        message_type: messageType,
        attachment_url: attachmentUrl,
        attachment_metadata: attachmentMetadata,
        read: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");
      setAttachmentPreview(null);
      scrollToBottom();

      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_profile_id: userProfile.id,
        sender_type: "provider",
        content: newMessage || "",
        message_type: messageType,
        attachment_url: attachmentUrl,
        attachment_metadata: attachmentMetadata,
      });

      if (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to upload attachment",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const renderMessages = () => {
    const groupedMessages: JSX.Element[] = [];
    let lastDate: Date | null = null;
    let lastSender: string | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);
      
      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        groupedMessages.push(
          <DateSeparator key={`date-${message.id}`} date={messageDate} />
        );
        lastDate = messageDate;
        lastSender = null;
      }

      const showAvatar = message.sender_type !== lastSender;
      lastSender = message.sender_type;

      groupedMessages.push(
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.sender_type === "provider"}
          showAvatar={showAvatar}
          senderName={
            message.sender_type === "homeowner"
              ? selectedConversation?.profiles?.full_name
              : userProfile?.full_name
          }
        />
      );
    });

    return groupedMessages;
  };

  return (
    <div className="flex flex-col bg-background overflow-hidden h-full">
      {/* Page Header - Only on desktop */}
      <div className="hidden md:block border-b p-4 bg-card shrink-0">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4 w-full max-w-md p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Messages Yet</h3>
            <p className="text-muted-foreground">
              Clients will appear here when they contact you.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Conversations List - Hidden on mobile when conversation selected */}
          <div className={cn(
            "w-full md:w-80 lg:w-96 border-r flex flex-col bg-muted/30 overflow-hidden",
            selectedConversation && "hidden md:flex"
          )}>
            <div className="border-b p-4 bg-background/95 backdrop-blur">
              <h2 className="font-bold text-xl">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {conversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  name={conv.profiles?.full_name || "Homeowner"}
                  lastMessage={conv.last_message_preview}
                  lastMessageAt={conv.last_message_at}
                  unreadCount={conv.unread_count_provider}
                  isSelected={selectedConversation?.id === conv.id}
                  onClick={() => setSelectedConversation(conv)}
                />
              ))}
            </div>
          </div>

          {/* Messages Area - Full width on mobile, fixed layout */}
                <div className={cn(
                  "flex-1 min-h-0 relative flex flex-col overflow-hidden",
                  !selectedConversation && "hidden md:flex"
                )}>
            {selectedConversation ? (
              <>
                {/* Fixed Header Section */}
                <div className="shrink-0">
                  {/* Messages Title - Mobile only */}
                  <div className="md:hidden border-b p-4 bg-background">
                    <h1 className="text-2xl font-bold">Messages</h1>
                  </div>
                  
                  {/* Chat Header with Client Info */}
                  <div className="border-b p-4 bg-card/95 backdrop-blur flex items-center gap-3 shadow-sm">
                    {/* Back button for mobile */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden shrink-0"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                        {selectedConversation.profiles?.full_name?.charAt(0) || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-base truncate">
                        {selectedConversation.profiles?.full_name || "Homeowner"}
                      </h2>
                      <p className="text-xs text-muted-foreground">Homeowner</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Messages Area - ONLY THIS SCROLLS */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-1 bg-muted/10"
                  style={{ 
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--muted) / 0.02) 10px, hsl(var(--muted) / 0.02) 20px)',
                    paddingBottom: 'calc(130px + env(safe-area-inset-bottom))'
                  }}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <p>No messages yet</p>
                      </div>
                    </div>
                  ) : (
                    renderMessages()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-20 md:bottom-20 right-8 rounded-full shadow-lg z-20"
                    onClick={() => scrollToBottom()}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}

                {/* Fixed Bottom Section */}
                <div className="absolute bottom-11 md:bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-sm">
                  {/* Attachment Preview */}
                  {attachmentPreview && (
                    <div className="border-b px-4 py-2 bg-card/50">
                      <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                        {attachmentPreview.type === 'image' && attachmentPreview.preview ? (
                          <img src={attachmentPreview.preview} alt="Preview" className="h-16 w-16 object-cover rounded" />
                        ) : (
                          <div className="h-16 w-16 bg-primary/10 rounded flex items-center justify-center">
                            <span className="text-2xl">📄</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachmentPreview.file.name}</p>
                          <p className="text-xs text-muted-foreground">{(attachmentPreview.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setAttachmentPreview(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="px-4 py-2 pb-2">
                    <div className="flex items-end gap-2">
                      <AttachmentButton
                        onFileSelect={handleFileSelect}
                        disabled={uploading}
                      />
                      <Textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="resize-none min-h-[44px] max-h-32"
                        rows={1}
                        disabled={uploading}
                      />
                      <Button
                        onClick={sendMessage}
                        size="icon"
                        className="shrink-0 h-11 w-11 rounded-full"
                        disabled={(!newMessage.trim() && !attachmentPreview) || uploading}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-10 w-10" />
                  </div>
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
