import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Helper to get organization ID
const getOrganizationId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!org) throw new Error("Organization not found");

  return org.id;
};

export function useProviderStats() {
  return useQuery({
    queryKey: ['providerStats'],
    queryFn: async () => {
      const orgId = await getOrganizationId();

      // Fetch all stats in parallel
      const [clientsResult, subscribersResult, bookingsResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id", { count: "exact" })
          .eq("organization_id", orgId)
          .eq("status", "active"),
        
        supabase
          .from("homeowner_subscriptions")
          .select("billing_amount", { count: "exact" })
          .eq("provider_org_id", orgId)
          .eq("status", "active"),
        
        supabase
          .from("bookings")
          .select("id", { count: "exact" })
          .eq("provider_org_id", orgId)
          .gte("date_time_start", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
          .in("status", ["pending", "confirmed"])
      ]);

      // Calculate MRR
      const { data: subscriptions } = subscribersResult;
      const mrr = subscriptions?.reduce((sum, sub) => sum + (sub.billing_amount || 0), 0) || 0;

      return {
        totalClients: clientsResult.count || 0,
        activeSubscribers: subscribersResult.count || 0,
        mrr,
        upcoming7d: bookingsResult.count || 0
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useTodayJobs() {
  return useQuery({
    queryKey: ['todayJobs'],
    queryFn: async () => {
      const orgId = await getOrganizationId();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          service_name,
          date_time_start,
          date_time_end,
          address,
          status,
          homeowner_profile_id,
          profiles:homeowner_profile_id (
            full_name,
            phone
          )
        `)
        .eq("provider_org_id", orgId)
        .gte("date_time_start", today.toISOString())
        .lt("date_time_start", tomorrow.toISOString())
        .order("date_time_start", { ascending: true })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useUnpaidInvoices() {
  return useQuery({
    queryKey: ['unpaidInvoices'],
    queryFn: async () => {
      const orgId = await getOrganizationId();

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          amount,
          due_date,
          status,
          client_id,
          clients (
            name,
            email
          )
        `)
        .eq("organization_id", orgId)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(5);

      if (error) throw error;

      const total = data?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

      return {
        invoices: data || [],
        total
      };
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useUnrepliedMessages() {
  return useQuery({
    queryKey: ['unrepliedMessages'],
    queryFn: async () => {
      const orgId = await getOrganizationId();

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          title,
          last_message_at,
          last_message_preview,
          unread_count_provider,
          homeowner_profile_id,
          profiles:homeowner_profile_id (
            full_name,
            avatar_url
          )
        `)
        .eq("provider_org_id", orgId)
        .gt("unread_count_provider", 0)
        .order("last_message_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 15000, // 15 seconds for messages
    refetchOnWindowFocus: true,
  });
}
