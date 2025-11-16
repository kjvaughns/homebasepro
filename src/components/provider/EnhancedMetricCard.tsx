import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  onClick?: () => void;
  colorClass?: string;
}

export function EnhancedMetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  onClick,
  colorClass = "text-primary",
}: EnhancedMetricCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Icon className={cn("h-4 w-4", colorClass)} />
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          {trend && (
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend.positive 
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            )}>
              {trend.positive ? "+" : ""}{trend.value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
