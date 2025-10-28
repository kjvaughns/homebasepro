import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

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

/**
 * Smart caching hook for workflow data
 * Reduces database queries while keeping data fresh
 */
export function useWorkflowCache(workflowId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;

      const { data, error } = await supabase
        .from('workflow_states')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      return data as WorkflowState;
    },
    enabled: !!workflowId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Refetch in background for active workflows
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const activeStages = ['job_in_progress', 'diagnostic_in_progress', 'ai_analyzing'];
      return activeStages.includes(data.workflow_stage) ? 30000 : false; // 30 seconds for active
    },
    refetchOnWindowFocus: true,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!workflowId) return;

    const channel = supabase
      .channel(`workflow-cache-${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_states',
          filter: `id=eq.${workflowId}`
        },
        (payload) => {
          console.log('Workflow cache update:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            // Optimistic update
            queryClient.setQueryData(['workflow', workflowId], payload.new);
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(['workflow', workflowId], null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, queryClient]);

  return query;
}

/**
 * Hook to fetch multiple workflows with caching
 */
export function useWorkflowsCache(filters?: {
  homeownerId?: string;
  providerOrgId?: string;
  stage?: string;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workflows', filters],
    queryFn: async () => {
      let query = supabase
        .from('workflow_states')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.homeownerId) {
        query = query.eq('homeowner_id', filters.homeownerId);
      }
      if (filters?.providerOrgId) {
        query = query.eq('provider_org_id', filters.providerOrgId);
      }
      if (filters?.stage) {
        query = query.eq('workflow_stage', filters.stage);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Populate individual workflow caches
      data?.forEach((workflow: WorkflowState) => {
        queryClient.setQueryData(['workflow', workflow.id], workflow);
      });

      return data as WorkflowState[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });

  // Subscribe to real-time updates for the list
  useEffect(() => {
    const channel = supabase
      .channel('workflows-cache')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_states'
        },
        () => {
          // Invalidate list cache on any change
          queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/**
 * Optimistic update helper
 */
export function useOptimisticWorkflowUpdate() {
  const queryClient = useQueryClient();

  return async (workflowId: string, updates: Partial<WorkflowState>) => {
    // Optimistically update cache
    queryClient.setQueryData(['workflow', workflowId], (old: WorkflowState | undefined) => {
      if (!old) return old;
      return { ...old, ...updates, updated_at: new Date().toISOString() };
    });

    // Actual update happens in the background
    try {
      const { error } = await supabase
        .from('workflow_states')
        .update(updates)
        .eq('id', workflowId);

      if (error) throw error;
    } catch (error) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      throw error;
    }
  };
}
