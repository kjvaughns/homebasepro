import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useProviderStats() {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeSubscribers: 0,
    mrr: 0,
    upcoming7d: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!org) return;

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Parallelize all queries for better performance
        const [
          { count: totalClients },
          { data: subscriptions, count: activeSubscribers },
          { count: upcoming7d }
        ] = await Promise.all([
          supabase
            .from("clients")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id)
            .eq("status", "active"),
          
          supabase
            .from("homeowner_subscriptions")
            .select("billing_amount", { count: "exact" })
            .eq("provider_org_id", org.id)
            .eq("status", "active")
            .eq("payment_method_active", true),
          
          supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("provider_org_id", org.id)
            .gte("date_time_start", new Date().toISOString())
            .lte("date_time_start", sevenDaysFromNow.toISOString())
            .neq("status", "cancelled")
        ]);

        const mrr = subscriptions?.reduce((sum, sub) => sum + (sub.billing_amount || 0), 0) / 100 || 0;

        setStats({
          totalClients: totalClients || 0,
          activeSubscribers: activeSubscribers || 0,
          mrr,
          upcoming7d: upcoming7d || 0,
        });
      } catch (error) {
        console.error("Error loading provider stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return { stats, loading };
}

export function useTodayJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!org) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data } = await supabase
          .from("bookings")
          .select("*")
          .eq("provider_org_id", org.id)
          .gte("date_time_start", today.toISOString())
          .lt("date_time_start", tomorrow.toISOString())
          .neq("status", "cancelled")
          .order("date_time_start", { ascending: true })
          .limit(6);

        setJobs(data || []);
      } catch (error) {
        console.error("Error loading today's jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  return { jobs, loading };
}

export function useUnpaidInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!org) return;

        const { data } = await supabase
          .from("payments")
          .select(`
            *,
            client_subscriptions!inner (
              clients!inner (
                name,
                organization_id
              )
            )
          `)
          .eq("client_subscriptions.clients.organization_id", org.id)
          .in("status", ["unpaid", "overdue"]);

        const totalAmount = data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

        setInvoices(data || []);
        setTotal(totalAmount);
      } catch (error) {
        console.error("Error loading unpaid invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  return { invoices, total, loading };
}

export function useUnrepliedMessages() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThreads = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!profile) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (!org) return;

        const { data } = await supabase
          .from("conversations")
          .select(`
            id,
            last_message_preview,
            last_message_at,
            unread_count_provider
          `)
          .eq("provider_org_id", org.id)
          .gt("unread_count_provider", 0)
          .order("last_message_at", { ascending: false })
          .limit(5);

        setThreads(data || []);
      } catch (error) {
        console.error("Error loading unreplied messages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, []);

  return { threads, loading };
}
