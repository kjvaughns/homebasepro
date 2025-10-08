import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationListItemProps {
  name: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  avatarUrl?: string;
  isSelected: boolean;
  onClick: () => void;
}

export const ConversationListItem = ({
  name,
  lastMessage,
  lastMessageAt,
  unreadCount,
  avatarUrl,
  isSelected,
  onClick,
}: ConversationListItemProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b",
        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {name?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-base truncate">{name}</h3>
          {lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {lastMessage || "No messages yet"}
          </p>
          {unreadCount && unreadCount > 0 && (
            <Badge className="h-5 min-w-[20px] px-1.5 shrink-0 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
