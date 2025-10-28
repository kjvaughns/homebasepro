import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkflowNotificationProps {
  type: "quote_received" | "quote_accepted" | "service_scheduled" | "workflow_advance";
  data: {
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
    stage?: string;
    amount?: number;
  };
  onDismiss?: () => void;
}

export function WorkflowNotification({ type, data, onDismiss }: WorkflowNotificationProps) {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (type) {
      case "quote_received":
        return <FileText className="h-5 w-5 text-primary" />;
      case "quote_accepted":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "service_scheduled":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "workflow_advance":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case "quote_received":
        return "border-primary/20 bg-primary/5";
      case "quote_accepted":
        return "border-green-200 bg-green-50";
      case "service_scheduled":
        return "border-blue-200 bg-blue-50";
      case "workflow_advance":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <Card className={`${getColor()} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold">{data.title}</h4>
              {data.stage && (
                <Badge variant="outline" className="text-xs">
                  {data.stage}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{data.message}</p>
            {data.amount && (
              <p className="text-lg font-bold text-primary mb-3">
                ${data.amount.toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              {data.actionLabel && data.actionUrl && (
                <Button
                  size="sm"
                  onClick={() => navigate(data.actionUrl!)}
                >
                  {data.actionLabel}
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
