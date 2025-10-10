import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "destructive";
}

const ReferralStatsCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: ReferralStatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between space-x-4">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p
              className={cn(
                "text-xl md:text-2xl font-bold",
                variant === "destructive" && "text-destructive"
              )}
            >
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className="text-xs font-medium text-primary mt-1">{trend}</p>
            )}
          </div>
          <div
            className={cn(
              "p-2 md:p-3 rounded-full shrink-0",
              variant === "destructive"
                ? "bg-destructive/10"
                : "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 md:h-5 md:w-5",
                variant === "destructive" ? "text-destructive" : "text-primary"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralStatsCard;
