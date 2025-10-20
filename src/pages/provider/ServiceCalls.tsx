import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ServiceCallCard } from "@/components/provider/ServiceCallCard";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ServiceCalls = () => {
  const [serviceCalls, setServiceCalls] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    service_name: "",
    quote_low: "",
    quote_high: "",
    scheduled_date: "",
    pre_job_notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const [callsResult, clientsResult] = await Promise.all([
        supabase
          .from("service_calls" as any)
          .select("*, clients(name, email)")
          .eq("provider_org_id", org.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("*")
          .eq("organization_id", org.id)
          .order("name"),
      ]);

      setServiceCalls(callsResult.data || []);
      setClients(clientsResult.data || []);
    } catch (error) {
      console.error("Error loading service calls:", error);
      toast.error("Failed to load service calls");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const { error } = await supabase.from("service_calls" as any).insert({
        provider_org_id: org.id,
        client_id: formData.client_id,
        service_name: formData.service_name,
        quote_low: parseInt(formData.quote_low),
        quote_high: parseInt(formData.quote_high),
        scheduled_date: formData.scheduled_date || null,
        pre_job_notes: formData.pre_job_notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Service call created successfully");
      setDialogOpen(false);
      setFormData({
        client_id: "",
        service_name: "",
        quote_low: "",
        quote_high: "",
        scheduled_date: "",
        pre_job_notes: "",
      });
      loadData();
    } catch (error) {
      console.error("Error creating service call:", error);
      toast.error("Failed to create service call");
    }
  };

  const handleComplete = async (id: string) => {
    const actualAmount = prompt("Enter final amount:");
    if (!actualAmount) return;

    try {
      const { error } = await supabase
        .from("service_calls" as any)
        .update({
          status: "completed",
          actual_amount: parseInt(actualAmount),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Service call marked as completed");
      loadData();
    } catch (error) {
      console.error("Error completing service call:", error);
      toast.error("Failed to complete service call");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Calls</h1>
          <p className="text-muted-foreground">Manage quotes and service requests</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Service Call
        </Button>
      </div>

      {serviceCalls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No service calls yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {serviceCalls.map((call) => (
            <ServiceCallCard
              key={call.id}
              serviceCall={call}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Service Call</DialogTitle>
            <DialogDescription>
              Generate a quote and schedule a service call
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="service">Service Name</Label>
              <Input
                id="service"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                placeholder="e.g., Lawn Mowing"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="low">Quote Low ($)</Label>
                <Input
                  id="low"
                  type="number"
                  value={formData.quote_low}
                  onChange={(e) => setFormData({ ...formData, quote_low: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="high">Quote High ($)</Label>
                <Input
                  id="high"
                  type="number"
                  value={formData.quote_high}
                  onChange={(e) => setFormData({ ...formData, quote_high: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date">Scheduled Date</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Pre-Job Notes</Label>
              <Textarea
                id="notes"
                value={formData.pre_job_notes}
                onChange={(e) => setFormData({ ...formData, pre_job_notes: e.target.value })}
                placeholder="Any special instructions or details..."
              />
            </div>
            <Button onClick={handleCreate} className="w-full">
              Create Service Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceCalls;
