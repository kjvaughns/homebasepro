import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useWorkflowState } from "@/hooks/useWorkflowState";
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Wrench, 
  FileCheck, 
  CreditCard, 
  Star,
  MessageSquare,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WorkflowTimelineProps {
  serviceRequestId: string;
  compact?: boolean;
}

const stageIcons: Record<string, any> = {
  request_submitted: FileText,
  ai_analyzing: Search,
  providers_matched: CheckCircle2,
  quote_sent: FileCheck,
  diagnostic_scheduled: Calendar,
  diagnostic_completed: Wrench,
  quote_approved: CheckCircle2,
  job_scheduled: Calendar,
  job_in_progress: Wrench,
  job_completed: CheckCircle2,
  invoice_sent: FileCheck,
  payment_received: CreditCard,
  review_requested: Star,
  workflow_complete: CheckCircle2
};

const stageActions: Record<string, { label: string; path: string } | null> = {
  quote_sent: { label: "View Quote", path: "/homeowner/browse" },
  diagnostic_scheduled: { label: "View Appointment", path: "/homeowner/appointments" },
  invoice_sent: { label: "Pay Invoice", path: "/homeowner/payment-settings" },
  review_requested: { label: "Leave Review", path: "/homeowner/browse" },
};

export default function WorkflowTimeline({ serviceRequestId, compact = false }: WorkflowTimelineProps) {
  const navigate = useNavigate();
  const { workflowState, loading, getStageProgress, getStageLabel } = useWorkflowState(serviceRequestId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workflowState) {
    return null;
  }

  const { current, total, percentage } = getStageProgress();
  const currentStage = workflowState.workflow_stage;
  const StageIcon = stageIcons[currentStage] || FileText;
  const action = stageActions[currentStage];

  const stages = [
    'request_submitted',
    'ai_analyzing',
    'providers_matched',
    'quote_sent',
    'diagnostic_scheduled',
    'diagnostic_completed',
    'quote_approved',
    'job_scheduled',
    'job_in_progress',
    'job_completed',
    'invoice_sent',
    'payment_received',
    'review_requested',
    'workflow_complete'
  ];

  const currentIndex = stages.indexOf(currentStage);

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StageIcon className="h-5 w-5 text-primary animate-pulse" />
              <div>
                <p className="font-semibold">{getStageLabel(currentStage)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(workflowState.stage_started_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Badge variant="secondary">{current} of {total}</Badge>
          </div>
          <Progress value={percentage} className="h-2" />
          {action && (
            <Button 
              size="sm" 
              className="w-full mt-3"
              onClick={() => navigate(action.path)}
            >
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <StageIcon className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{getStageLabel(currentStage)}</h3>
                <p className="text-sm text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(workflowState.updated_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1">
              Step {current} of {total}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Started {formatDistanceToNow(new Date(workflowState.created_at), { addSuffix: true })}</span>
              <span>{percentage}% complete</span>
            </div>
          </div>

          {/* Visual Stage Timeline */}
          <div className="relative">
            <div className="flex justify-between items-center">
              {['Request', 'Quote', 'Diagnostic', 'Job', 'Payment', 'Complete'].map((label, idx) => {
                const stageIdx = idx * 2; // Simplified mapping
                const isComplete = stageIdx < currentIndex;
                const isCurrent = stageIdx === currentIndex;
                
                return (
                  <div key={label} className="flex flex-col items-center flex-1">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                      ${isComplete ? 'bg-primary border-primary text-primary-foreground' : ''}
                      ${isCurrent ? 'bg-primary/20 border-primary animate-pulse' : ''}
                      ${!isComplete && !isCurrent ? 'bg-background border-muted' : ''}
                    `}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span className="text-xs mt-1 text-center">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {action && (
              <Button 
                className="flex-1"
                onClick={() => navigate(action.path)}
              >
                {action.label}
              </Button>
            )}
          </div>

          {/* Estimated Time */}
          {!workflowState.stage_completed_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Clock className="h-4 w-4" />
              <span>Provider typically responds within 2 hours</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
