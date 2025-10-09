import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface Client {
  id: string;
  homeowner: {
    full_name: string;
    phone: string | null;
  };
  home: {
    name: string;
    address: string;
  };
  service_plan: {
    name: string;
    service_type: string[] | null;
  };
  billing_amount: number;
  status: string;
  created_at: string;
  next_service_date: string | null;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
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
        .from("homeowner_subscriptions")
        .select(`
          *,
          homeowner:profiles!homeowner_id(full_name, phone),
          home:homes!home_id(name, address),
          service_plan:service_plans!service_plan_id(name, service_type)
        `)
        .eq("provider_org_id", organization.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.homeowner.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.home.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.home.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first client
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Homeowner</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Service Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Next Visit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{client.homeowner.full_name}</div>
                    <div className="text-sm text-muted-foreground">{client.homeowner.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{client.home.name}</div>
                    <div className="text-sm text-muted-foreground">{client.home.address}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{client.service_plan.name}</div>
                    {client.service_plan.service_type && (
                      <div className="text-sm text-muted-foreground">
                        {client.service_plan.service_type.join(", ")}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>${(client.billing_amount / 100).toFixed(2)}</TableCell>
                <TableCell>
                  {client.next_service_date 
                    ? new Date(client.next_service_date).toLocaleDateString()
                    : "Not scheduled"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = `/homeowner/subscriptions/${client.id}`}
                  >
                    View
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
        onSuccess={loadClients}
      />
    </div>
  );
}
