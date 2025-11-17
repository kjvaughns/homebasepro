import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, Clock, DollarSign, CheckCircle, PlayCircle, FileText, CreditCard, ArrowRight, AlertCircle, User, Phone, Navigation, MoreVertical, Edit, Trash2, XCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    date_time_start?: string;
    date_time_end?: string;
    estimated_price_low?: number;
    estimated_price_high?: number;
    homeowner_name?: string;
    client_id?: string;
    clients?: {
      name: string;
      phone?: string;
    };
    profiles?: {
      full_name: string;
      phone?: string;
    };
    workflow?: Array<{
      workflow_stage: string;
      stage_started_at: string;
      stage_completed_at?: string;
    }>;
  };
  onAction?: (jobId: string, action: string) => void;
  onClientClick?: (clientId: string) => void;
  onJobClick?: (job: any) => void;
  onEdit?: (job: any) => void;
  onDelete?: (job: any) => void;
  view?: "schedule" | "jobs";
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
  confirmed: {
    color: "bg-blue-500/20 text-blue-700",
    label: "Confirmed",
    actions: [
      { label: "Start Job", action: "started", icon: PlayCircle },
      { label: "Details", action: "view", icon: FileText, variant: "outline" }
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
      { label: "En Route", action: "en_route", icon: MapPin },
      { label: "Details", action: "view", icon: FileText, variant: "outline" }
    ]
  },
  en_route: {
    color: "bg-secondary text-secondary-foreground",
    label: "En Route",
    actions: [
      { label: "Start Job", action: "started", icon: PlayCircle }
    ]
  },
  started: {
    color: "bg-primary/30 text-primary",
    label: "In Progress",
    actions: [
      { label: "Complete", action: "completed", icon: CheckCircle }
    ]
  },
  paused: {
    color: "bg-muted text-muted-foreground",
    label: "Paused",
    actions: [
      { label: "Resume", action: "started", icon: PlayCircle }
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
      { label: "Generate Invoice", action: "auto_invoice", icon: FileText }
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
  const config = statusConfig[job.status] || statusConfig.confirmed || statusConfig.lead;
  const primaryAction = config.actions[0];
  const PrimaryIcon = primaryAction?.icon;
  
  const clientName = job.clients?.name || job.profiles?.full_name || "New Client";
  const clientPhone = job.clients?.phone || job.profiles?.phone || null;
  
  // Calculate workflow progress
  const workflowStages = ['request_submitted', 'providers_matched', 'diagnostic_scheduled', 'quote_sent', 'job_scheduled', 'job_in_progress', 'job_completed', 'invoice_sent', 'payment_received'];
  const currentWorkflow = job.workflow?.[0];
  const currentStageIndex = currentWorkflow ? workflowStages.indexOf(currentWorkflow.workflow_stage) : -1;
  const progress = currentStageIndex >= 0 ? ((currentStageIndex + 1) / workflowStages.length) * 100 : 0;
  
  // Calculate time in current stage
  const timeInStage = currentWorkflow?.stage_started_at 
    ? formatDistanceToNow(new Date(currentWorkflow.stage_started_at), { addSuffix: true })
    : null;
  
  // Check if stuck (>48 hours in same stage)
  const isStuck = currentWorkflow?.stage_started_at && !currentWorkflow.stage_completed_at
    ? (Date.now() - new Date(currentWorkflow.stage_started_at).getTime()) > 48 * 60 * 60 * 1000
    : false;
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{clientName}</h3>
              <Badge className={config.color} variant="secondary">
                {config.label}
              </Badge>
              {isStuck && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  At Risk
                </Badge>
              )}
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
        
        {/* Workflow Progress */}
        {currentWorkflow && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                Workflow: {currentWorkflow.workflow_stage.replace(/_/g, ' ')}
                {timeInStage && ` (${timeInStage})`}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
        
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
