import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkflowState {
  id: string;
  service_request_id: string | null;
  service_call_id: string | null;
  quote_id: string | null;
  booking_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  homeowner_id: string;
  provider_org_id: string | null;
  workflow_stage: string;
  stage_started_at: string;
  stage_completed_at: string | null;
  homeowner_notified_at: string | null;
  provider_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkflowState(serviceRequestId: string | null) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceRequestId) {
      setLoading(false);
      return;
    }

    loadWorkflowState();
    subscribeToChanges();

    return () => {
      unsubscribeFromChanges();
    };
  }, [serviceRequestId]);

  const loadWorkflowState = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("workflow_states")
        .select("*")
        .eq("service_request_id", serviceRequestId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setWorkflowState(data);
    } catch (err) {
      console.error("Error loading workflow state:", err);
      setError(err instanceof Error ? err.message : "Failed to load workflow state");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    if (!serviceRequestId) return;

    const channel = supabase
      .channel(`workflow-${serviceRequestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_states',
          filter: `service_request_id=eq.${serviceRequestId}`
        },
        (payload) => {
          console.log("Workflow state changed:", payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setWorkflowState(payload.new as WorkflowState);
            
            // Show notification for stage changes
            const newStage = (payload.new as WorkflowState).workflow_stage;
            const stageLabels: Record<string, string> = {
              request_submitted: "Request Submitted",
              ai_analyzing: "AI Analyzing",
              providers_matched: "Providers Matched",
              quote_sent: "Quote Sent",
              diagnostic_scheduled: "Diagnostic Scheduled",
              diagnostic_completed: "Diagnostic Completed",
              quote_approved: "Quote Approved",
              job_scheduled: "Job Scheduled",
              job_in_progress: "Job In Progress",
              job_completed: "Job Completed",
              invoice_sent: "Invoice Sent",
              payment_received: "Payment Received",
              review_requested: "Review Requested",
              workflow_complete: "Workflow Complete"
            };

            if (payload.eventType === 'UPDATE' && payload.old) {
              const oldStage = (payload.old as WorkflowState).workflow_stage;
              if (oldStage !== newStage) {
                toast.success(`Workflow Updated: ${stageLabels[newStage] || newStage}`);
              }
            }
          }
        }
      )
      .subscribe();

    return channel;
  };

  const unsubscribeFromChanges = () => {
    if (!serviceRequestId) return;
    supabase.removeChannel(supabase.channel(`workflow-${serviceRequestId}`));
  };

  const advanceStage = async (newStage: string, metadata?: any) => {
    if (!workflowState) {
      throw new Error("No workflow state to advance");
    }

    try {
      const { error: updateError } = await supabase
        .from("workflow_states")
        .update({
          workflow_stage: newStage,
          stage_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", workflowState.id);

      if (updateError) throw updateError;

      toast.success("Workflow stage updated");
    } catch (err) {
      console.error("Error advancing workflow stage:", err);
      toast.error("Failed to update workflow stage");
      throw err;
    }
  };

  const getStageProgress = () => {
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

    if (!workflowState) return { current: 0, total: stages.length, percentage: 0 };

    const currentIndex = stages.indexOf(workflowState.workflow_stage);
    const percentage = ((currentIndex + 1) / stages.length) * 100;

    return {
      current: currentIndex + 1,
      total: stages.length,
      percentage: Math.round(percentage)
    };
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      request_submitted: "Request Submitted",
      ai_analyzing: "AI Analyzing",
      providers_matched: "Providers Matched",
      quote_sent: "Quote Sent",
      diagnostic_scheduled: "Diagnostic Scheduled",
      diagnostic_completed: "Diagnostic Completed",
      quote_approved: "Quote Approved",
      job_scheduled: "Job Scheduled",
      job_in_progress: "Job In Progress",
      job_completed: "Job Completed",
      invoice_sent: "Invoice Sent",
      payment_received: "Payment Received",
      review_requested: "Review Requested",
      workflow_complete: "Complete"
    };

    return labels[stage] || stage;
  };

  return {
    workflowState,
    loading,
    error,
    advanceStage,
    getStageProgress,
    getStageLabel,
    refresh: loadWorkflowState
  };
}
