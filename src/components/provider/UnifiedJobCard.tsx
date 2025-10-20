import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, DollarSign, CheckCircle, PlayCircle, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface UnifiedJobCardProps {
  job: {
    id: string;
    service_name: string;
    address?: string;
    status: string;
    window_start?: string;
    window_end?: string;
    quote_low?: number;
    quote_high?: number;
    deposit_due?: number;
    deposit_paid?: boolean;
    total_due?: number;
    is_service_call?: boolean;
    clients?: {
      name: string;
      phone?: string;
    };
  };
  onAction?: (jobId: string, action: string) => void;
}

const statusConfig: Record<string, { 
  color: string; 
  label: string;
  actions: Array<{ label: string; action: string; icon: any; variant?: string }>;
}> = {
  lead: {
    color: "bg-muted text-muted-foreground",
    label: "Lead",
    actions: [
      { label: "Quote", action: "quote", icon: DollarSign },
      { label: "Book", action: "schedule", icon: Calendar, variant: "outline" }
    ]
  },
  service_call: {
    color: "bg-primary/10 text-primary",
    label: "Service Call",
    actions: [
      { label: "Start", action: "start", icon: PlayCircle },
      { label: "Quote", action: "quote", icon: DollarSign, variant: "outline" }
    ]
  },
  quoted: {
    color: "bg-accent text-accent-foreground",
    label: "Quoted",
    actions: [
      { label: "Schedule", action: "schedule", icon: Calendar }
    ]
  },
  scheduled: {
    color: "bg-primary/20 text-primary",
    label: "Scheduled",
    actions: [
      { label: "Start", action: "start", icon: PlayCircle }
    ]
  },
  in_progress: {
    color: "bg-secondary text-secondary-foreground",
    label: "In Progress",
    actions: [
      { label: "Complete", action: "complete", icon: CheckCircle }
    ]
  },
  completed: {
    color: "bg-primary/10 text-primary",
    label: "Completed",
    actions: [
      { label: "Invoice", action: "invoice", icon: FileText }
    ]
  },
  invoiced: {
    color: "bg-accent text-accent-foreground",
    label: "Invoiced",
    actions: [
      { label: "Mark Paid", action: "mark_paid", icon: CreditCard }
    ]
  },
  paid: {
    color: "bg-primary text-primary-foreground",
    label: "Paid",
    actions: []
  },
  cancelled: {
    color: "bg-destructive/10 text-destructive",
    label: "Cancelled",
    actions: []
  }
};

export const UnifiedJobCard = ({ job, onAction }: UnifiedJobCardProps) => {
  const config = statusConfig[job.status] || statusConfig.lead;
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{job.service_name}</CardTitle>
            {job.clients && (
              <p className="text-sm text-muted-foreground truncate">{job.clients.name}</p>
            )}
          </div>
          <Badge className={config.color} variant="secondary">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Address */}
        {job.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground line-clamp-2">{job.address}</span>
          </div>
        )}
        
        {/* Time Window */}
        {job.window_start && (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(job.window_start), 'MMM d, yyyy')}</span>
            </div>
            {job.window_end && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(job.window_start), 'h:mm a')} - {format(new Date(job.window_end), 'h:mm a')}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Pricing */}
        {(job.deposit_due || job.quote_low || job.total_due) && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {job.is_service_call && job.deposit_due ? (
              <div className="flex items-center gap-2">
                <span className="font-medium">${job.deposit_due} diagnostic</span>
                {job.deposit_paid && (
                  <Badge variant="outline" className="text-xs">Paid</Badge>
                )}
              </div>
            ) : job.quote_low && job.quote_high ? (
              <span className="font-medium">${job.quote_low} - ${job.quote_high}</span>
            ) : job.total_due ? (
              <span className="font-medium">${job.total_due}</span>
            ) : null}
          </div>
        )}
        
        {/* Action Buttons */}
        {config.actions.length > 0 && onAction && (
          <div className="flex gap-2 pt-2 border-t">
            {config.actions.map((actionConfig) => {
              const Icon = actionConfig.icon;
              return (
                <Button
                  key={actionConfig.action}
                  size="sm"
                  variant={(actionConfig.variant as any) || "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(job.id, actionConfig.action);
                  }}
                  className="flex-1"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {actionConfig.label}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
