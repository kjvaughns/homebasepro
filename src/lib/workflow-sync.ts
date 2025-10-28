import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkflowMetadata {
  quote_id?: string;
  booking_id?: string;
  invoice_id?: string;
  service_call_id?: string;
  amount?: number;
  scheduled_date?: string;
  [key: string]: any;
}

/**
 * Central orchestrator for advancing workflows and syncing across all tables
 */
export async function advanceWorkflowStage(
  workflowId: string,
  newStage: string,
  metadata: WorkflowMetadata
): Promise<void> {
  try {
    // Update workflow_states table
    const { error: updateError } = await supabase
      .from("workflow_states")
      .update({
        workflow_stage: newStage,
        stage_completed_at: new Date().toISOString(),
        stage_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...metadata
      })
      .eq("id", workflowId);

    if (updateError) throw updateError;

    // Create notifications (handled by database triggers)
    // Create follow-up actions if needed
    await createFollowUpActions(workflowId, newStage, metadata);

    // Log AI learning event for completed workflows
    if (newStage === 'workflow_complete') {
      await logAILearningEvent(workflowId, metadata);
    }
  } catch (error) {
    console.error("Error advancing workflow stage:", error);
    throw error;
  }
}

/**
 * Create workflow from a service request
 */
export async function createWorkflowFromServiceRequest(
  serviceRequestId: string,
  homeownerId: string,
  providerOrgId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("workflow_states")
      .insert({
        service_request_id: serviceRequestId,
        homeowner_id: homeownerId,
        provider_org_id: providerOrgId,
        workflow_stage: 'request_submitted',
        stage_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error("Error creating workflow:", error);
    throw error;
  }
}

/**
 * Sync job status changes to workflow
 */
export async function syncJobToWorkflow(jobId: string, jobStatus: string): Promise<void> {
  try {
    // Find workflow associated with this job
    const { data: workflow } = await supabase
      .from("workflow_states")
      .select("id, workflow_stage")
      .or(`booking_id.eq.${jobId},service_call_id.eq.${jobId}`)
      .single();

    if (!workflow) return;

    // Map job status to workflow stage
    const stageMap: Record<string, string> = {
      'scheduled': 'job_scheduled',
      'in_progress': 'job_in_progress',
      'completed': 'job_completed',
      'confirmed': 'diagnostic_scheduled'
    };

    const newStage = stageMap[jobStatus];
    if (newStage && newStage !== workflow.workflow_stage) {
      await advanceWorkflowStage(workflow.id, newStage, {});
    }
  } catch (error) {
    console.error("Error syncing job to workflow:", error);
  }
}

/**
 * Sync quote actions to workflow
 */
export async function syncQuoteToWorkflow(
  quoteId: string,
  action: 'sent' | 'accepted' | 'rejected',
  metadata?: WorkflowMetadata
): Promise<void> {
  try {
    const { data: workflow } = await supabase
      .from("workflow_states")
      .select("id")
      .eq("quote_id", quoteId)
      .single();

    if (!workflow) return;

    const stageMap = {
      'sent': 'quote_sent',
      'accepted': 'quote_approved',
      'rejected': 'providers_matched' // Back to matching
    };

    await advanceWorkflowStage(workflow.id, stageMap[action], {
      quote_id: quoteId,
      ...metadata
    });

    // If accepted, create booking
    if (action === 'accepted' && metadata?.scheduled_date) {
      await createBookingFromQuote(quoteId, metadata);
    }
  } catch (error) {
    console.error("Error syncing quote to workflow:", error);
  }
}

/**
 * Sync invoice payment to workflow
 */
export async function syncInvoiceToWorkflow(invoiceId: string, paid: boolean): Promise<void> {
  try {
    const { data: workflow } = await supabase
      .from("workflow_states")
      .select("id")
      .eq("invoice_id", invoiceId)
      .single();

    if (!workflow) return;

    if (paid) {
      await advanceWorkflowStage(workflow.id, 'payment_received', {
        invoice_id: invoiceId
      });
    }
  } catch (error) {
    console.error("Error syncing invoice to workflow:", error);
  }
}

/**
 * Create follow-up actions based on workflow stage
 */
async function createFollowUpActions(
  workflowId: string,
  stage: string,
  metadata: WorkflowMetadata
): Promise<void> {
  try {
    const { data: workflow } = await supabase
      .from("workflow_states")
      .select("homeowner_id, provider_org_id, booking_id, service_call_id")
      .eq("id", workflowId)
      .single();

    if (!workflow) return;

    // Review request after payment
    if (stage === 'payment_received') {
      await supabase.from("follow_up_actions").insert({
        homeowner_id: workflow.homeowner_id,
        provider_org_id: workflow.provider_org_id,
        booking_id: workflow.booking_id,
        service_visit_id: workflow.service_call_id,
        action_type: 'review_request',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours later
        status: 'pending'
      });
    }

    // Appointment reminder before scheduled job
    if (stage === 'job_scheduled' && metadata.scheduled_date) {
      const scheduledTime = new Date(metadata.scheduled_date);
      const reminderTime = new Date(scheduledTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

      await supabase.from("follow_up_actions").insert({
        homeowner_id: workflow.homeowner_id,
        provider_org_id: workflow.provider_org_id,
        booking_id: workflow.booking_id,
        action_type: 'appointment_reminder',
        scheduled_for: reminderTime.toISOString(),
        status: 'pending'
      });
    }
  } catch (error) {
    console.error("Error creating follow-up actions:", error);
  }
}

/**
 * Log AI learning event for completed workflows
 */
async function logAILearningEvent(workflowId: string, metadata: WorkflowMetadata): Promise<void> {
  try {
    const { data: workflow } = await supabase
      .from("workflow_states")
      .select(`
        *,
        bookings(estimated_price_low, estimated_price_high, final_price, service_name),
        quotes(total_cost),
        service_calls(diagnosis, parts_needed)
      `)
      .eq("id", workflowId)
      .single();

    if (!workflow) return;

    const booking = (workflow.bookings as any)?.[0];
    const quote = (workflow.quotes as any)?.[0];
    const serviceCall = (workflow.service_calls as any)?.[0];

    await supabase.from("ai_learning_events").insert({
      event_type: 'workflow_complete',
      service_request_id: workflow.service_request_id,
      booking_id: workflow.booking_id,
      quote_id: workflow.quote_id,
      service_call_id: workflow.service_call_id,
      provider_org_id: workflow.provider_org_id,
      service_category: booking?.service_name || 'unknown',
      ai_predicted: {
        price_low: booking?.estimated_price_low,
        price_high: booking?.estimated_price_high
      },
      actual_outcome: {
        quote_amount: quote?.total_cost,
        final_price: booking?.final_price,
        diagnosis: serviceCall?.diagnosis,
        parts_needed: serviceCall?.parts_needed
      },
      accuracy_score: calculateAccuracy(booking, quote),
      complexity_factors: metadata.complexity_factors || []
    });
  } catch (error) {
    console.error("Error logging AI learning event:", error);
  }
}

/**
 * Calculate accuracy score for AI predictions
 */
function calculateAccuracy(booking: any, quote: any): number {
  if (!booking || !quote || !booking.estimated_price_low || !quote.total_cost) {
    return 0;
  }

  const estimatedAvg = (booking.estimated_price_low + booking.estimated_price_high) / 2;
  const actual = quote.total_cost;
  const percentDiff = Math.abs((actual - estimatedAvg) / estimatedAvg) * 100;

  // Convert to 0-1 scale (100% diff = 0 accuracy, 0% diff = 1 accuracy)
  return Math.max(0, 1 - (percentDiff / 100));
}

/**
 * Create booking from accepted quote
 */
async function createBookingFromQuote(quoteId: string, metadata: WorkflowMetadata): Promise<void> {
  try {
    const { data: quote } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (!quote) return;

    // This would create a booking - implementation depends on your booking structure
    // For now, just update the workflow with booking_id if it was passed
    if (metadata.booking_id) {
      await supabase
        .from("workflow_states")
        .update({ booking_id: metadata.booking_id })
        .eq("quote_id", quoteId);
    }
  } catch (error) {
    console.error("Error creating booking from quote:", error);
  }
}
