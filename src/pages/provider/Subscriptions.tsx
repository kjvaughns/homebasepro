import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
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
import { AddSubscriptionDialog } from "@/components/provider/AddSubscriptionDialog";

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
  clients: { name: string; homeowner_profile_id: string | null };
  service_plans: { name: string; price: number; billing_frequency: string };
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
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
      setOrgId(organization.id);

      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          clients!inner (name, organization_id, homeowner_profile_id),
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

  const handleMessageClient = async (subscription: Subscription) => {
    if (!subscription.clients.homeowner_profile_id || !orgId) return;

    try {
      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("homeowner_profile_id", subscription.clients.homeowner_profile_id)
        .eq("provider_org_id", orgId)
        .maybeSingle();

      if (existingConv) {
        navigate("/provider/messages");
        return;
      }

      // Create new conversation
      const { error } = await supabase
        .from("conversations")
        .insert({
          homeowner_profile_id: subscription.clients.homeowner_profile_id,
          provider_org_id: orgId,
        });

      if (error) throw error;

      navigate("/provider/messages");
    } catch (error) {
      console.error("Error opening conversation:", error);
      toast({
        title: "Error",
        description: "Failed to open conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage client service subscriptions
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Subscription
        </Button>
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
              <TableHead>Actions</TableHead>
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
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMessageClient(sub)}
                    disabled={!sub.clients.homeowner_profile_id}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AddSubscriptionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadSubscriptions}
      />
    </div>
  );
}
