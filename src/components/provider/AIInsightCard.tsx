import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, AlertCircle, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface AIInsightCardProps {
  title: string;
  description: string;
  type?: 'tip' | 'alert' | 'suggestion';
  actionLabel?: string;
  onAction?: () => void;
}

const typeConfig = {
  tip: {
    icon: Lightbulb,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  alert: {
    icon: AlertCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  suggestion: {
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
};

export const AIInsightCard = ({ title, description, type = 'tip', actionLabel, onAction }: AIInsightCardProps) => {
  const Icon = typeConfig[type].icon;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={typeConfig[type].bgColor}>
      <CardContent className="p-4">
        <div 
          className="flex items-start gap-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Icon className={`h-5 w-5 ${typeConfig[type].color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{title}</p>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-50" />
              ) : (
                <ChevronDown className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-50" />
              )}
            </div>
            {isExpanded && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {actionLabel && onAction && isExpanded && (
              <Button size="sm" variant="outline" onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}>
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
