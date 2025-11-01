import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Workflow stage progression map
const WORKFLOW_PROGRESSION: Record<string, string> = {
  'quote_created': 'quote_sent',
  'quote_accepted': 'job_scheduled',
  'booking_scheduled': 'job_scheduled',
  'job_started': 'job_in_progress',
  'job_completed': 'job_completed',
  'invoice_generated': 'invoice_sent',
  'invoice_sent': 'invoice_sent',
  'payment_received': 'payment_received'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { 
      action, 
      quoteId, 
      bookingId, 
      invoiceId, 
      homeownerId, 
      providerOrgId, 
      metadata 
    } = await req.json();

    console.log(`📊 Workflow orchestrator: ${action}`, { quoteId, bookingId, invoiceId });

    // Get next workflow stage
    const nextStage = WORKFLOW_PROGRESSION[action];
    if (!nextStage) {
      throw new Error(`Unknown workflow action: ${action}`);
    }

    // Find or create workflow
    let workflow = null;
    let serviceRequestId = null;

    // Try to find existing workflow
    if (quoteId) {
      const { data: quote } = await supabaseClient
        .from('quotes')
        .select('service_request_id')
        .eq('id', quoteId)
        .single();
      serviceRequestId = quote?.service_request_id;
    } else if (bookingId) {
      const { data: booking } = await supabaseClient
        .from('bookings')
        .select('service_request_id')
        .eq('id', bookingId)
        .single();
      serviceRequestId = booking?.service_request_id;
    }

    if (serviceRequestId) {
      const { data } = await supabaseClient
        .from('workflow_states')
        .select('*')
        .eq('service_request_id', serviceRequestId)
        .single();
      workflow = data;
    }

    // Create workflow if doesn't exist
    if (!workflow) {
      const { data: newWorkflow, error: createError } = await supabaseClient
        .from('workflow_states')
        .insert({
          service_request_id: serviceRequestId,
          homeowner_profile_id: homeownerId,
          provider_org_id: providerOrgId,
          workflow_stage: nextStage,
          stage_started_at: new Date().toISOString(),
          metadata: metadata || {}
        })
        .select()
        .single();

      if (createError) throw createError;
      workflow = newWorkflow;
      console.log(`✅ Created new workflow: ${workflow.id}`);
    } else {
      // Update existing workflow
      const { error: updateError } = await supabaseClient
        .from('workflow_states')
        .update({
          workflow_stage: nextStage,
          stage_started_at: new Date().toISOString(),
          stage_completed_at: null,
          metadata: { ...workflow.metadata, ...metadata, last_action: action }
        })
        .eq('id', workflow.id);

      if (updateError) throw updateError;
      console.log(`✅ Advanced workflow to: ${nextStage}`);
    }

    // Trigger follow-up actions based on stage
    if (action === 'quote_created') {
      // Notify homeowner
      await supabaseClient.functions.invoke('dispatch-notification', {
        body: {
          userId: homeownerId,
          profileId: homeownerId,
          type: 'quote_received',
          title: '📋 New Quote Received',
          message: `You have a new quote for ${metadata?.service_name}`,
          action_url: `/homeowner/quotes/${quoteId}`,
          forceChannels: { inapp: true, email: true }
        }
      });
    }

    if (action === 'quote_accepted') {
      // Notify provider
      const { data: org } = await supabaseClient
        .from('organizations')
        .select('owner_id, profiles!organizations_owner_id_fkey(user_id, id)')
        .eq('id', providerOrgId)
        .single();

      if (org?.profiles) {
        await supabaseClient.functions.invoke('dispatch-notification', {
          body: {
            userId: org.profiles.user_id,
            profileId: org.profiles.id,
            type: 'quote_accepted',
            title: '🎉 Quote Accepted!',
            message: `Your quote for ${metadata?.service_name} was accepted`,
            action_url: '/provider/jobs',
            forceChannels: { inapp: true, push: true }
          }
        });
      }
    }

    if (action === 'job_completed') {
      // Auto-generate invoice
      try {
        await supabaseClient.functions.invoke('auto-generate-invoice', {
          body: { bookingId }
        });
      } catch (error) {
        console.error('Failed to auto-generate invoice:', error);
      }
    }

    if (action === 'payment_received') {
      // Mark workflow complete
      await supabaseClient
        .from('workflow_states')
        .update({
          stage_completed_at: new Date().toISOString(),
          metadata: { ...workflow.metadata, completed: true }
        })
        .eq('id', workflow.id);

      // Schedule review request for 24 hours later
      await supabaseClient.from('follow_up_actions').insert({
        homeowner_id: homeownerId,
        provider_org_id: providerOrgId,
        booking_id: bookingId,
        action_type: 'review_request',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        workflow_id: workflow.id,
        stage: nextStage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Workflow orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
