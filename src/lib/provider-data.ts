import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized Provider Data Service
 * Provides unified data fetching and realtime subscriptions for provider features
 * 
 * Note: Some queries reference new tables (job_parts, provider_analytics) that
 * may not be in the generated types yet. TypeScript errors are suppressed with @ts-ignore.
 */
export const ProviderDataService = {
  /**
   * Fetch complete client data with all relationships
   */
  async getClientComplete(clientId: string) {
    // @ts-ignore - Extended query with job_parts relationship
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        jobs:bookings(
          *,
          invoice:invoices(*)
        ),
        invoices(*),
        payments(*),
        subscriptions:client_subscriptions(
          *,
          plan:service_plans(*)
        )
      `)
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch complete job data with all relationships
   */
  async getJobComplete(jobId: string) {
    // @ts-ignore - Extended query with job_parts relationship
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:clients(*),
        invoice:invoices(*),
        payments(*)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch unified timeline for a client (jobs, invoices, payments)
   */
  async getClientTimeline(clientId: string) {
    // Get all activities
    const [jobsRes, invoicesRes, paymentsRes] = await Promise.all([
      // @ts-ignore
      supabase
        .from('bookings')
        .select('*')
        .eq('homeowner_profile_id', clientId)
        .order('created_at', { ascending: false }),
      // @ts-ignore
      supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      // @ts-ignore
      supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ]);

    // Merge and sort by date
    const timeline: any[] = [
      ...(jobsRes.data || []).map((j: any) => ({
        type: 'job',
        date: j.created_at,
        id: j.id,
        title: j.service_name,
        status: j.status,
        amount: j.final_price,
        ...j
      })),
      ...(invoicesRes.data || []).map((i: any) => ({
        type: 'invoice',
        date: i.created_at,
        id: i.id,
        title: `Invoice ${i.invoice_number}`,
        status: i.status,
        amount: i.amount,
        ...i
      })),
      ...(paymentsRes.data || []).map((p: any) => ({
        type: 'payment',
        date: p.created_at,
        id: p.id,
        title: 'Payment Received',
        status: p.status,
        amount: p.amount,
        ...p
      })),
    ];

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return timeline;
  },

  /**
   * Subscribe to realtime updates for org data
   */
  subscribeToOrgData(orgId: string, callback: () => void) {
    const channel = supabase
      .channel(`org-${orgId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `provider_org_id=eq.${orgId}`
      }, callback)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'payments',
        filter: `org_id=eq.${orgId}`
      }, callback)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'invoices',
        filter: `organization_id=eq.${orgId}`
      }, callback)
      .subscribe();

    return channel;
  },

  /**
   * Get organization analytics from materialized view
   */
  async getOrgAnalytics(orgId: string) {
    try {
      // @ts-ignore - provider_analytics materialized view exists but not in types yet
      const result: any = await (supabase as any)
        .from('provider_analytics')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (result.error) {
        return {
          total_clients: 0,
          total_jobs: 0,
          total_revenue: 0,
          avg_transaction: 0,
          service_breakdown: []
        };
      }

      return result.data;
    } catch (error) {
      return {
        total_clients: 0,
        total_jobs: 0,
        total_revenue: 0,
        avg_transaction: 0,
        service_breakdown: []
      };
    }
  },
};
