import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface ServiceCallCardProps {
  serviceCall: {
    id: string;
    service_name: string;
    quote_low: number;
    quote_high: number;
    status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
    scheduled_date?: string;
    pre_job_notes?: string;
    actual_amount?: number;
    clients?: {
      name: string;
    };
  };
  onComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusConfig = {
  pending: { color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", icon: Clock },
  approved: { color: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: CheckCircle },
  in_progress: { color: "bg-purple-500/10 text-purple-700 dark:text-purple-400", icon: Clock },
  completed: { color: "bg-green-500/10 text-green-700 dark:text-green-400", icon: CheckCircle },
  cancelled: { color: "bg-red-500/10 text-red-700 dark:text-red-400", icon: XCircle },
};

export const ServiceCallCard = ({ serviceCall, onComplete, onEdit, onCancel }: ServiceCallCardProps) => {
  const StatusIcon = statusConfig[serviceCall.status].icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{serviceCall.service_name}</CardTitle>
            {serviceCall.clients && (
              <p className="text-sm text-muted-foreground">{serviceCall.clients.name}</p>
            )}
          </div>
          <Badge className={statusConfig[serviceCall.status].color} variant="secondary">
            <StatusIcon className="w-3 h-3 mr-1" />
            {serviceCall.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              ${serviceCall.quote_low} - ${serviceCall.quote_high}
            </span>
          </div>
          {serviceCall.scheduled_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(serviceCall.scheduled_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {serviceCall.pre_job_notes && (
          <div className="flex gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground">{serviceCall.pre_job_notes}</p>
          </div>
        )}

        {serviceCall.actual_amount && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Final Amount: <span className="font-medium text-foreground">${serviceCall.actual_amount}</span>
            </p>
          </div>
        )}

        {serviceCall.status !== 'completed' && serviceCall.status !== 'cancelled' && (
          <div className="flex gap-2 pt-2">
            {onComplete && (
              <Button size="sm" onClick={() => onComplete(serviceCall.id)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(serviceCall.id)}>
                Edit
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(serviceCall.id)}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
