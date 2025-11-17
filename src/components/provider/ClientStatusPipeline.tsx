import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserPlus, Phone, FileText, CheckCircle, Star } from "lucide-react";

interface ClientStatusPipelineProps {
  statusCounts: Record<string, number>;
  activeStatus: string;
  onStatusClick: (status: string) => void;
}

const statusConfig = {
  lead: {
    label: "Leads",
    icon: UserPlus,
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgLight: "bg-yellow-50",
  },
  contacted: {
    label: "Contacted",
    icon: Phone,
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgLight: "bg-blue-50",
  },
  quoted: {
    label: "Quoted",
    icon: FileText,
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgLight: "bg-purple-50",
  },
  active: {
    label: "Active",
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-700",
    bgLight: "bg-green-50",
  },
  subscribed: {
    label: "Subscribed",
    icon: Star,
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgLight: "bg-emerald-50",
  },
};

export function ClientStatusPipeline({ statusCounts, activeStatus, onStatusClick }: ClientStatusPipelineProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {Object.entries(statusConfig).map(([status, config]) => {
        const Icon = config.icon;
        const count = statusCounts[status] || 0;
        const isActive = activeStatus === status;

        return (
          <Card
            key={status}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isActive && "ring-2 ring-primary"
            )}
            onClick={() => onStatusClick(status)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={cn("p-2 rounded-full", config.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{config.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
