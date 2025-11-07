import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartTypingIndicatorProps {
  message?: string;
}

export function SmartTypingIndicator({ message }: SmartTypingIndicatorProps) {
  return (
    <div className="flex gap-3 animate-fade-in">
      <Avatar className="h-8 w-8 shrink-0 bg-muted">
        <AvatarFallback>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1">
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1">
            {/* Typing dots */}
            <span className={cn(
              "h-2 w-2 rounded-full bg-muted-foreground/60",
              "animate-bounce [animation-delay:-0.3s]"
            )} />
            <span className={cn(
              "h-2 w-2 rounded-full bg-muted-foreground/60",
              "animate-bounce [animation-delay:-0.15s]"
            )} />
            <span className={cn(
              "h-2 w-2 rounded-full bg-muted-foreground/60",
              "animate-bounce"
            )} />
          </div>
        </div>

        {message && (
          <span className="text-xs text-muted-foreground px-1">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}