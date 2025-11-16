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
      
      // Get user's organization through organizations table
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        setClients([]);
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!org) {
        setClients([]);
        return;
      }

      // Fetch all clients for the organization
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", org.id)
        .order("name");

      if (error) throw error;

      // Enrich with additional data
      const enriched = await Promise.all(
        (clientsData || []).map(async (client) => {
          if (!client.homeowner_profile_id) {
            return {
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              address: client.address,
              status: client.status,
              organization_id: client.organization_id,
              homeowner_profile_id: null,
              lifetime_value: client.lifetime_value || 0,
              last_contact_at: client.last_contact_at,
              tags: client.tags || [],
              plan_name: null,
              plan_amount: 0,
              plan_status: null,
              property_address: null,
              property_city: null,
              property_state: null,
              next_visit: null,
              last_job_date: null,
              total_jobs: 0,
              outstanding_balance: 0,
              unread_count: 0,
            };
          }

          // Get subscription info
          const { data: subscriptions } = await supabase
            .from("homeowner_subscriptions")
            .select(`
              status,
              billing_amount,
              service_plans (
                name
              )
            `)
            .eq("homeowner_id", client.homeowner_profile_id)
            .eq("provider_org_id", org.id)
            .limit(1);

          const subscription = subscriptions?.[0];
          
          // Get property info
          const { data: homes } = await supabase
            .from("homes")
            .select("address, city, state")
            .eq("owner_id", client.homeowner_profile_id)
            .limit(1);

          const home = homes?.[0];

          // Get job stats using date_time_start
          const { data: jobs } = await supabase
            .from("bookings")
            .select("date_time_start, status")
            .eq("homeowner_profile_id", client.homeowner_profile_id)
            .eq("provider_org_id", org.id)
            .order("date_time_start", { ascending: false });

          const completedJobs = jobs?.filter(j => j.status === "completed") || [];
          const upcomingJobs = jobs?.filter(j => 
            ['pending', 'confirmed'].includes(j.status) && 
            new Date(j.date_time_start) > new Date()
          ) || [];

          // Get payment stats - payments are linked through subscriptions
          let outstandingBalance = 0;
          if (subscription) {
            const { data: subIds } = await supabase
              .from("client_subscriptions")
              .select("id")
              .eq("client_id", client.id);

            if (subIds && subIds.length > 0) {
              const { data: payments } = await supabase
                .from("payments")
                .select("amount, status")
                .in("client_subscription_id", subIds.map(s => s.id));

              const unpaid = payments?.filter(p => p.status !== "completed") || [];
              outstandingBalance = unpaid.reduce((sum, p) => sum + (p.amount || 0), 0);
            }
          }

          // Get unread message count
          const { data: convos } = await supabase
            .from("conversations")
            .select("unread_count_provider")
            .eq("homeowner_profile_id", client.homeowner_profile_id)
            .eq("provider_org_id", org.id);

          const unreadCount = convos?.[0]?.unread_count_provider || 0;

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
            plan_name: (subscription as any)?.service_plans?.name || null,
            plan_amount: subscription?.billing_amount || 0,
            plan_status: subscription?.status || null,
            property_address: home?.address || null,
            property_city: home?.city || null,
            property_state: home?.state || null,
            next_visit: upcomingJobs[0]?.date_time_start || null,
            last_job_date: completedJobs[0]?.date_time_start || null,
            total_jobs: completedJobs.length,
            outstanding_balance: outstandingBalance,
            unread_count: unreadCount,
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

      // Fetch client base data
      const { data: clientData, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (error) throw error;

      // Fetch related data separately
      const [notes, files, commLogs, subscriptions, properties, tags, jobs] = await Promise.all([
        supabase.from("client_notes").select("*, author:author_profile_id(full_name)").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("client_files").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("comm_logs").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        clientData.homeowner_profile_id 
          ? supabase.from("homeowner_subscriptions").select("*, service_plans(*)").eq("homeowner_id", clientData.homeowner_profile_id)
          : Promise.resolve({ data: [] }),
        clientData.homeowner_profile_id
          ? supabase.from("homes").select("*").eq("owner_id", clientData.homeowner_profile_id)
          : Promise.resolve({ data: [] }),
        supabase.from("client_tag_assignments").select("client_tags(*)").eq("client_id", clientId),
        clientData.homeowner_profile_id
          ? supabase.from("bookings").select("*").eq("homeowner_profile_id", clientData.homeowner_profile_id).order("date_time_start", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      // Fetch payments through subscriptions
      let paymentsData: any[] = [];
      if (clientData.homeowner_profile_id) {
        const { data: subIds } = await supabase
          .from("client_subscriptions")
          .select("id")
          .eq("client_id", clientId);

        if (subIds && subIds.length > 0) {
          const { data } = await supabase
            .from("payments")
            .select("*")
            .in("client_subscription_id", subIds.map(s => s.id))
            .order("created_at", { ascending: false });
          paymentsData = data || [];
        }
      }

      // Get or create conversation
      let conversationId = null;
      if (clientData.homeowner_profile_id) {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();

          if (org) {
            const { data: conversation } = await supabase
              .from("conversations")
              .select("id")
              .eq("homeowner_profile_id", clientData.homeowner_profile_id)
              .eq("provider_org_id", org.id)
              .maybeSingle();

            if (conversation) {
              conversationId = conversation.id;
            } else {
              // Create conversation
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();

              if (profile) {
                const { data: newConv } = await supabase
                  .from("conversations")
                  .insert({
                    homeowner_profile_id: clientData.homeowner_profile_id,
                    provider_org_id: org.id,
                  })
                  .select("id")
                  .maybeSingle();

                conversationId = newConv?.id || null;
              }
            }
          }
        }
      }

      // Calculate stats
      const jobsList = jobs.data || [];
      const completedJobs = jobsList.filter(j => j.status === "completed");
      const upcomingJobs = jobsList.filter(j => 
        j.status === "scheduled" && 
        new Date(j.date_time_start) > new Date()
      );

      const unpaidPayments = paymentsData.filter(p => p.status !== "completed");
      const outstandingBalance = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const subscription = subscriptions.data?.[0];
      const home = properties.data?.[0];

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
        plan_name: (subscription as any)?.service_plans?.name || null,
        plan_amount: subscription?.billing_amount || 0,
        plan_status: subscription?.status || null,
        property_address: home?.address || null,
        property_city: home?.city || null,
        property_state: home?.state || null,
        next_visit: upcomingJobs[0]?.date_time_start || null,
        last_job_date: completedJobs[0]?.date_time_start || null,
        total_jobs: completedJobs.length,
        outstanding_balance: outstandingBalance,
        unread_count: 0,
        // Detail fields
        notes: notes.data || [],
        files: files.data || [],
        comm_logs: commLogs.data || [],
        subscriptions: subscriptions.data || [],
        properties: properties.data || [],
        jobs: jobsList,
        payments: paymentsData,
        client_tags: tags.data?.map((t: any) => t.client_tags).filter(Boolean) || [],
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

        // Get subscription IDs for payment lookup
        const { data: subIds } = await supabase
          .from("client_subscriptions")
          .select("id")
          .eq("client_id", clientId);

        // Fetch all activity types
        const [jobs, payments, commLogs, notes] = await Promise.all([
          supabase
            .from("bookings")
            .select("*")
            .eq("homeowner_profile_id", client.homeowner_profile_id),
          subIds && subIds.length > 0
            ? supabase
                .from("payments")
                .select("*")
                .in("client_subscription_id", subIds.map(s => s.id))
            : Promise.resolve({ data: [] }),
          supabase
            .from("comm_logs")
            .select("*")
            .eq("client_id", clientId),
          supabase
            .from("client_notes")
            .select("*, author:author_profile_id(full_name)")
            .eq("client_id", clientId),
        ]);

        const items: ActivityItem[] = [];

        // Add jobs using date_time_start
        jobs.data?.forEach((job) => {
          items.push({
            id: job.id,
            type: "job",
            date: job.date_time_start || job.created_at,
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
            title: `Note by ${(note.author as any)?.full_name || "Unknown"}`,
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

        // Get job stats using date_time_start
        const { data: jobs } = await supabase
          .from("bookings")
          .select("date_time_start, status")
          .eq("homeowner_profile_id", client.homeowner_profile_id);

        const completedJobs = jobs?.filter(j => j.status === "completed") || [];
        const lastService = completedJobs.sort((a, b) => 
          new Date(b.date_time_start).getTime() - new Date(a.date_time_start).getTime()
        )[0];

        // Get payment stats through subscriptions
        const { data: subIds } = await supabase
          .from("client_subscriptions")
          .select("id")
          .eq("client_id", clientId);

        let outstandingBalance = 0;
        if (subIds && subIds.length > 0) {
          const { data: payments } = await supabase
            .from("payments")
            .select("amount, status")
            .in("client_subscription_id", subIds.map(s => s.id));

          const unpaid = payments?.filter(p => p.status !== "completed") || [];
          outstandingBalance = unpaid.reduce((sum, p) => sum + (p.amount || 0), 0);
        }

        setStats({
          lifetimeValue: client.lifetime_value || 0,
          totalJobs: completedJobs.length,
          avgRating: 0, // TODO: Implement when reviews exist
          lastServiceDate: lastService?.date_time_start || null,
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
