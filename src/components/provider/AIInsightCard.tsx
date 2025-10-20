import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, AlertCircle, TrendingUp } from "lucide-react";

interface AIInsightCardProps {
  message: string;
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

export const AIInsightCard = ({ message, type = 'tip', actionLabel, onAction }: AIInsightCardProps) => {
  const Icon = typeConfig[type].icon;

  return (
    <Card className={typeConfig[type].bgColor}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${typeConfig[type].color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 space-y-2">
            <p className="text-sm">{message}</p>
            {actionLabel && onAction && (
              <Button size="sm" variant="outline" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
