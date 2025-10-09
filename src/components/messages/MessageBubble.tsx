import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  message_type?: string;
  attachment_url?: string;
  attachment_metadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  read?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  senderName?: string;
  avatarUrl?: string;
}

export const MessageBubble = ({ 
  message, 
  isOwn, 
  showAvatar,
  senderName,
  avatarUrl 
}: MessageBubbleProps) => {
  const isImage = message.message_type === 'image' && message.attachment_url;
  const isFile = message.message_type === 'file' && message.attachment_url;

  return (
    <div className={cn("flex gap-2 mb-0.5", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <Avatar className={cn("h-8 w-8 shrink-0", !showAvatar && "invisible")}>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {senderName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[70%] sm:max-w-[65%]", isOwn && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 shadow-sm max-w-full",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border rounded-bl-md"
          )}
        >
          {isImage && (
            <img
              src={message.attachment_url}
              alt="Attachment"
              className="rounded-lg max-w-full h-auto mb-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.attachment_url, '_blank')}
            />
          )}
          
          {isFile && message.attachment_metadata && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-background/10 hover:bg-background/20 transition-colors"
            >
              <span className="text-2xl">📎</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {message.attachment_metadata.filename}
                </div>
                <div className="text-xs opacity-70">
                  {(message.attachment_metadata.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </a>
          )}
          
          {message.content && (
            <p className="text-base whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {isOwn && (
            <span className="text-xs text-muted-foreground">
              {message.read ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
