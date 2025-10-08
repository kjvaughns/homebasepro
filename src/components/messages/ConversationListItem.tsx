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
        "mx-3 my-2 p-4 cursor-pointer transition-all rounded-xl bg-card border shadow-sm hover:shadow-md",
        isSelected && "ring-2 ring-primary/20 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
            {name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-lg truncate">{name}</h3>
            {lastMessageAt && (
              <span className="text-sm text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false })}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground truncate flex-1">
              {lastMessage || "No messages yet"}
            </p>
            {unreadCount && unreadCount > 0 && (
              <Badge className="h-5 min-w-[20px] px-1.5 shrink-0 rounded-full bg-primary">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
