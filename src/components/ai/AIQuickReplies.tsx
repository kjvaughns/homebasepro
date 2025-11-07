import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIQuickRepliesProps {
  suggestions: string[];
  onSelect: (reply: string) => void;
  className?: string;
}

export function AIQuickReplies({ suggestions, onSelect, className }: AIQuickRepliesProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-wrap gap-2 animate-fade-in",
      className
    )}>
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          className={cn(
            "text-xs transition-all duration-200",
            "hover:scale-105 hover:shadow-sm",
            "border-primary/20 hover:border-primary/40",
            "animate-fade-in"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
          {suggestion}
        </Button>
      ))}
    </div>
  );
}