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
  const primaryAction = config.actions[0];
  const PrimaryIcon = primaryAction?.icon;
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{job.clients?.name || "New Client"}</h3>
              <Badge className={config.color} variant="secondary">
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{job.service_name}</p>
          </div>
        </div>
        
        {/* Compact Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {job.window_start && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span className="truncate">
                {format(new Date(job.window_start), 'MMM d, h:mm a')}
              </span>
            </div>
          )}
          
          {job.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="truncate">{job.address.split(',')[0]}</span>
            </div>
          )}
          
          {(job.quote_low || job.total_due || job.deposit_due) && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium">
                {job.total_due && `$${job.total_due}`}
                {job.quote_low && job.quote_high && `$${job.quote_low}-${job.quote_high}`}
                {job.deposit_due && !job.deposit_paid && `$${job.deposit_due} diag`}
              </span>
            </div>
          )}
        </div>
        
        {/* Primary Action Button */}
        {primaryAction && onAction && (
          <Button 
            size="sm" 
            className="w-full mt-3"
            variant={(primaryAction.variant as any) || "default"}
            onClick={(e) => {
              e.stopPropagation();
              onAction(job.id, primaryAction.action);
            }}
          >
            {PrimaryIcon && <PrimaryIcon className="h-4 w-4 mr-2" />}
            {primaryAction.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
