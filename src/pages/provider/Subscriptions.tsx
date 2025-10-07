import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
  clients: { name: string };
  service_plans: { name: string; price: number; billing_frequency: string };
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          clients!inner (name, organization_id),
          service_plans (name, price, billing_frequency)
        `)
        .eq("clients.organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage client service subscriptions
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No subscriptions yet</h3>
          <p className="text-muted-foreground">
            Subscriptions will appear here when clients sign up for your services
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Billing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.clients.name}</TableCell>
                <TableCell>{sub.service_plans.name}</TableCell>
                <TableCell>${(sub.service_plans.price / 100).toFixed(2)}</TableCell>
                <TableCell>{sub.service_plans.billing_frequency}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      sub.status === "active"
                        ? "default"
                        : sub.status === "paused"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.next_billing_date
                    ? new Date(sub.next_billing_date).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
