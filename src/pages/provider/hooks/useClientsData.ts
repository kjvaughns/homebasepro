import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  organization_id: string;
  homeowner_profile_id: string | null;
  lifetime_value: number;
  last_contact_at: string | null;
  tags: string[];
  // Enriched data
  plan_name: string | null;
  plan_amount: number;
  plan_status: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  next_visit: string | null;
  last_job_date: string | null;
  total_jobs: number;
  outstanding_balance: number;
  unread_count: number;
}

export function useClientsList() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Get user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) {
        setClients([]);
        return;
      }

      // Fetch all clients for the organization
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select(`
          *,
          homeowner_subscriptions (
            id,
            service_plan:service_plans (
              name,
              price_per_visit
            ),
            status
          ),
          homes (
            address_line_1,
            city,
            state
          )
        `)
        .eq("organization_id", profile.organization_id)
        .order("name");

      if (error) throw error;

      // Enrich with additional data
      const enriched = await Promise.all(
        (clientsData || []).map(async (client) => {
          // Get latest subscription
          const subscription = client.homeowner_subscriptions?.[0];
          
          // Get job stats
          const { data: jobs } = await supabase
            .from("bookings")
            .select("scheduled_date, status")
            .eq("homeowner_profile_id", client.homeowner_profile_id)
            .order("scheduled_date", { ascending: false });

          const completedJobs = jobs?.filter(j => j.status === "completed") || [];
          const upcomingJobs = jobs?.filter(j => 
            j.status === "scheduled" && 
            new Date(j.scheduled_date) > new Date()
          ) || [];

          // Get payment stats
          const { data: payments } = await supabase
            .from("payments")
            .select("amount, status")
            .eq("homeowner_profile_id", client.homeowner_profile_id);

          const unpaidPayments = payments?.filter(p => p.status !== "completed") || [];
          const outstandingBalance = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

          // Get unread message count
          const { count: unreadCount } = await supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id)
            .eq("unread_by_provider", true);

          return {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            status: client.status,
            organization_id: client.organization_id,
            homeowner_profile_id: client.homeowner_profile_id,
            lifetime_value: client.lifetime_value || 0,
            last_contact_at: client.last_contact_at,
            tags: client.tags || [],
            plan_name: subscription?.service_plan?.name || null,
            plan_amount: subscription?.service_plan?.price_per_visit || 0,
            plan_status: subscription?.status || null,
            property_address: client.homes?.[0]?.address_line_1 || null,
            property_city: client.homes?.[0]?.city || null,
            property_state: client.homes?.[0]?.state || null,
            next_visit: upcomingJobs[0]?.scheduled_date || null,
            last_job_date: completedJobs[0]?.scheduled_date || null,
            total_jobs: completedJobs.length,
            outstanding_balance: outstandingBalance,
            unread_count: unreadCount || 0,
          };
        })
      );

      setClients(enriched);
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  return { clients, loading, refetch: loadClients };
}

export interface ClientDetail extends ClientListItem {
  notes: any[];
  files: any[];
  comm_logs: any[];
  subscriptions: any[];
  properties: any[];
  jobs: any[];
  payments: any[];
  client_tags: any[];
  conversation_id: string | null;
}

export function useClientDetail(clientId: string | null) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClient = async () => {
    if (!clientId) {
      setClient(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch client with all related data
      const { data: clientData, error } = await supabase
        .from("clients")
        .select(`
          *,
          client_notes (
            id,
            body,
            created_at,
            author:profiles (
              id,
              full_name
            )
          ),
          client_files (
            id,
            file_name,
            file_path,
            file_type,
            file_size,
            category,
            created_at
          ),
          comm_logs (
            id,
            channel,
            direction,
            subject,
            body,
            created_at
          ),
          homeowner_subscriptions (
            id,
            status,
            next_billing_date,
            service_plan:service_plans (
              name,
              price_per_visit,
              description
            )
          ),
          homes (
            id,
            address_line_1,
            address_line_2,
            city,
            state,
            zip_code,
            square_footage,
            lot_size,
            notes
          ),
          client_tag_assignments (
            tag:client_tags (
              id,
              name,
              color
            )
          )
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;

      // Fetch jobs (bookings)
      const { data: jobs } = await supabase
        .from("bookings")
        .select(`
          id,
          service_name,
          scheduled_date,
          status,
          notes,
          quote_amount
        `)
        .eq("homeowner_profile_id", clientData.homeowner_profile_id)
        .order("scheduled_date", { ascending: false });

      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("homeowner_profile_id", clientData.homeowner_profile_id)
        .order("created_at", { ascending: false });

      // Get or create conversation
      let conversationId = null;
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();

      if (conversation) {
        conversationId = conversation.id;
      } else {
        // Create conversation for this client
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, organization_id")
          .eq("id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (profile && clientData.homeowner_profile_id) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              provider_profile_id: profile.id,
              homeowner_profile_id: clientData.homeowner_profile_id,
              client_id: clientId,
              organization_id: profile.organization_id,
            })
            .select("id")
            .single();

          conversationId = newConv?.id || null;
        }
      }

      // Calculate stats for the list item fields
      const completedJobs = jobs?.filter(j => j.status === "completed") || [];
      const upcomingJobs = jobs?.filter(j => 
        j.status === "scheduled" && 
        new Date(j.scheduled_date) > new Date()
      ) || [];

      const unpaidPayments = payments?.filter(p => p.status !== "completed") || [];
      const outstandingBalance = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const subscription = clientData.homeowner_subscriptions?.[0];

      setClient({
        // Base fields
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        status: clientData.status,
        organization_id: clientData.organization_id,
        homeowner_profile_id: clientData.homeowner_profile_id,
        lifetime_value: clientData.lifetime_value || 0,
        last_contact_at: clientData.last_contact_at,
        tags: clientData.tags || [],
        plan_name: subscription?.service_plan?.name || null,
        plan_amount: subscription?.service_plan?.price_per_visit || 0,
        plan_status: subscription?.status || null,
        property_address: clientData.homes?.[0]?.address_line_1 || null,
        property_city: clientData.homes?.[0]?.city || null,
        property_state: clientData.homes?.[0]?.state || null,
        next_visit: upcomingJobs[0]?.scheduled_date || null,
        last_job_date: completedJobs[0]?.scheduled_date || null,
        total_jobs: completedJobs.length,
        outstanding_balance: outstandingBalance,
        unread_count: 0,
        // Detail fields
        notes: clientData.client_notes || [],
        files: clientData.client_files || [],
        comm_logs: clientData.comm_logs || [],
        subscriptions: clientData.homeowner_subscriptions || [],
        properties: clientData.homes || [],
        jobs: jobs || [],
        payments: payments || [],
        client_tags: clientData.client_tag_assignments?.map((a: any) => a.tag) || [],
        conversation_id: conversationId,
      });
    } catch (error) {
      console.error("Error loading client detail:", error);
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  return { client, loading, refetch: loadClient };
}

export interface ActivityItem {
  id: string;
  type: "job" | "payment" | "comm" | "note";
  date: string;
  title: string;
  description?: string;
  status?: string;
  amount?: number;
  metadata?: any;
}

export function useClientActivity(clientId: string | null) {
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setTimeline([]);
      setLoading(false);
      return;
    }

    const loadActivity = async () => {
      try {
        setLoading(true);

        const { data: client } = await supabase
          .from("clients")
          .select("homeowner_profile_id")
          .eq("id", clientId)
          .single();

        if (!client?.homeowner_profile_id) {
          setTimeline([]);
          return;
        }

        // Fetch all activity types
        const [jobs, payments, commLogs, notes] = await Promise.all([
          supabase
            .from("bookings")
            .select("*")
            .eq("homeowner_profile_id", client.homeowner_profile_id),
          supabase
            .from("payments")
            .select("*")
            .eq("homeowner_profile_id", client.homeowner_profile_id),
          supabase
            .from("comm_logs")
            .select("*")
            .eq("client_id", clientId),
          supabase
            .from("client_notes")
            .select(`
              *,
              author:profiles (
                full_name
              )
            `)
            .eq("client_id", clientId),
        ]);

        const items: ActivityItem[] = [];

        // Add jobs
        jobs.data?.forEach((job) => {
          items.push({
            id: job.id,
            type: "job",
            date: job.scheduled_date || job.created_at,
            title: job.service_name,
            description: job.notes,
            status: job.status,
            metadata: job,
          });
        });

        // Add payments
        payments.data?.forEach((payment) => {
          items.push({
            id: payment.id,
            type: "payment",
            date: payment.created_at,
            title: `Payment ${payment.status}`,
            amount: payment.amount,
            status: payment.status,
            metadata: payment,
          });
        });

        // Add communications
        commLogs.data?.forEach((log) => {
          items.push({
            id: log.id,
            type: "comm",
            date: log.created_at,
            title: `${log.channel.toUpperCase()} ${log.direction === "out" ? "sent" : "received"}`,
            description: log.subject || log.body?.substring(0, 100),
            metadata: log,
          });
        });

        // Add notes
        notes.data?.forEach((note) => {
          items.push({
            id: note.id,
            type: "note",
            date: note.created_at,
            title: `Note by ${note.author?.full_name || "Unknown"}`,
            description: note.body.substring(0, 100),
            metadata: note,
          });
        });

        // Sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTimeline(items);
      } catch (error) {
        console.error("Error loading activity:", error);
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [clientId]);

  return { timeline, loading };
}

export function useClientStats(clientId: string | null) {
  const [stats, setStats] = useState({
    lifetimeValue: 0,
    totalJobs: 0,
    avgRating: 0,
    lastServiceDate: null as string | null,
    outstandingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setStats({
        lifetimeValue: 0,
        totalJobs: 0,
        avgRating: 0,
        lastServiceDate: null,
        outstandingBalance: 0,
      });
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      try {
        setLoading(true);

        const { data: client } = await supabase
          .from("clients")
          .select("homeowner_profile_id, lifetime_value")
          .eq("id", clientId)
          .single();

        if (!client?.homeowner_profile_id) return;

        // Get job stats
        const { data: jobs } = await supabase
          .from("bookings")
          .select("scheduled_date, status")
          .eq("homeowner_profile_id", client.homeowner_profile_id);

        const completedJobs = jobs?.filter(j => j.status === "completed") || [];
        const lastService = completedJobs.sort((a, b) => 
          new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
        )[0];

        // Get payment stats
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, status")
          .eq("homeowner_profile_id", client.homeowner_profile_id);

        const unpaid = payments?.filter(p => p.status !== "completed") || [];
        const outstandingBalance = unpaid.reduce((sum, p) => sum + (p.amount || 0), 0);

        setStats({
          lifetimeValue: client.lifetime_value || 0,
          totalJobs: completedJobs.length,
          avgRating: 0, // TODO: Implement when reviews exist
          lastServiceDate: lastService?.scheduled_date || null,
          outstandingBalance,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [clientId]);

  return { stats, loading };
}
