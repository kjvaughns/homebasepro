import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntercomStyleMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  avatar?: string;
  isStreaming?: boolean;
}

export function IntercomStyleMessage({ 
  role, 
  content, 
  timestamp, 
  avatar,
  isStreaming 
}: IntercomStyleMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 animate-fade-in",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <Avatar className={cn(
        "h-8 w-8 shrink-0",
        isUser ? "bg-primary" : "bg-muted"
      )}>
        {avatar ? (
          <AvatarImage src={avatar} />
        ) : (
          <AvatarFallback>
            {isUser ? (
              <User className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Bot className="h-4 w-4 text-muted-foreground" />
            )}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Message Bubble */}
      <div className={cn(
        "flex flex-col gap-1 max-w-[85%] md:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted text-foreground rounded-tl-sm",
          isStreaming && "animate-pulse"
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-muted-foreground px-1">
            {new Date(timestamp).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </span>
        )}
      </div>
    </div>
  );
}