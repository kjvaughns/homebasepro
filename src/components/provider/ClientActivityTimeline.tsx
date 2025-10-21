import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  DollarSign,
  Mail,
  MessageSquare,
  Phone,
  FileText,
} from "lucide-react";
import { ActivityItem } from "@/pages/provider/hooks/useClientsData";

interface ClientActivityTimelineProps {
  timeline: ActivityItem[];
  loading: boolean;
}

export default function ClientActivityTimeline({
  timeline,
  loading,
}: ClientActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
        <p className="text-muted-foreground">
          Activity will appear here as you interact with this client
        </p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Calendar className="h-5 w-5" />;
      case "payment":
        return <DollarSign className="h-5 w-5" />;
      case "comm":
        return <MessageSquare className="h-5 w-5" />;
      case "note":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "job":
        return "text-blue-500";
      case "payment":
        return "text-green-500";
      case "comm":
        return "text-purple-500";
      case "note":
        return "text-orange-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {timeline.map((item, index) => (
        <Card key={item.id} className="p-4">
          <div className="flex gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 ${getTypeColor(item.type)}`}>
              {getIcon(item.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                {item.status && (
                  <Badge variant="outline" className="text-xs">
                    {item.status}
                  </Badge>
                )}
                {item.amount !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    ${item.amount.toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Connector line (except for last item) */}
          {index < timeline.length - 1 && (
            <div className="ml-2.5 mt-2 h-4 border-l-2 border-muted" />
          )}
        </Card>
      ))}
    </div>
  );
}
