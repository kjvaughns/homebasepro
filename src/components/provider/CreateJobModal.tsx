import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Users } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

interface CreateJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedClient?: any;
  preSelectedDate?: Date;
  onSuccess: () => void;
}

type ClientMode = "existing" | "new";

interface Client {
  id: string;
  name: string;
  email: string;
  homeowner_profile_id: string;
  address?: string;
}

export default function CreateJobModal({
  open,
  onOpenChange,
  preSelectedClient,
  preSelectedDate,
  onSuccess,
}: CreateJobModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientMode, setClientMode] = useState<ClientMode>(preSelectedClient ? "existing" : "new");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(preSelectedClient || null);
  
  const [formData, setFormData] = useState({
    service_name: "",
    scheduled_date: preSelectedDate || undefined as Date | undefined,
    duration: "1",
    status: "scheduled",
    quote_amount: "",
    notes: "",
    address: "",
  });

  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Load existing clients
  useEffect(() => {
    if (open && clientMode === "existing") {
      loadClients();
    }
  }, [open, clientMode]);

  // Pre-fill address when client is selected
  useEffect(() => {
    if (selectedClient?.address) {
      setFormData(prev => ({ ...prev, address: selectedClient.address || "" }));
    }
  }, [selectedClient]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!org) return;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, homeowner_profile_id, address")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const validateNewClient = () => {
    if (!newClientData.name.trim()) {
      toast({
        title: "Client name required",
        description: "Please enter the client's name",
        variant: "destructive",
      });
      return false;
    }
    if (!newClientData.email.trim()) {
      toast({
        title: "Client email required",
        description: "Please enter the client's email",
        variant: "destructive",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }
    if (!newClientData.address.trim()) {
      toast({
        title: "Address required",
        description: "Please enter the client's address",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateJob = () => {
    if (!formData.service_name.trim()) {
      toast({
        title: "Service required",
        description: "Please enter the service name",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.scheduled_date) {
      toast({
        title: "Date required",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.address.trim()) {
      toast({
        title: "Address required",
        description: "Please enter the job address",
        variant: "destructive",
      });
      return false;
    }
    if (clientMode === "existing" && !selectedClient) {
      toast({
        title: "Client required",
        description: "Please select a client",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientMode === "new" && !validateNewClient()) return;
    if (!validateJob()) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!org) {
        toast({
          title: "Setup Required",
          description: "Please complete your business setup",
          variant: "destructive",
        });
        return;
      }

      let clientProfileId = selectedClient?.homeowner_profile_id;

      // Create new client if needed
      if (clientMode === "new") {
        // Check for duplicate email
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id, homeowner_profile_id")
          .eq("organization_id", org.id)
          .eq("email", newClientData.email.toLowerCase())
          .maybeSingle();

        if (existingClient) {
          toast({
            title: "Client already exists",
            description: "A client with this email already exists in your list",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create client record (homeowner_profile_id can be null until they sign up)
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            organization_id: org.id,
            homeowner_profile_id: null, // Will be linked when/if they create an account
            name: newClientData.name,
            email: newClientData.email.toLowerCase(),
            phone: newClientData.phone || null,
            address: newClientData.address,
            status: "active",
          })
          .select()
          .single();

        if (clientError) throw clientError;

        // For jobs, we'll use a placeholder profile approach
        // Try to find or create a minimal profile entry
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_type", "homeowner")
          .is("user_id", null)
          .limit(1)
          .maybeSingle();

        if (existingProfile) {
          clientProfileId = existingProfile.id;
          // Link the client to this profile
          await supabase
            .from("clients")
            .update({ homeowner_profile_id: existingProfile.id })
            .eq("id", newClient.id);
        } else {
          // We need a profile ID for bookings - this is a limitation
          // For now, skip creating the job if no profile exists
          toast({
            title: "Client created successfully",
            description: "However, jobs require clients to have an account. Ask them to sign up first.",
            variant: "destructive",
          });
          setLoading(false);
          onSuccess();
          onOpenChange(false);
          return;
        }
      }

      // Only create job if we have a valid profile ID
      if (!clientProfileId) {
        toast({
          title: "Cannot create job",
          description: "This client needs to create an account before jobs can be scheduled",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create job using atomic RPC function
      const startDateTime = formData.scheduled_date;
      const durationHours = parseFloat(formData.duration);
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

      const { data: result, error: bookingError } = await supabase.rpc(
        "check_and_create_booking",
        {
          p_provider_org_id: org.id,
          p_homeowner_profile_id: clientProfileId!,
          p_service_name: formData.service_name,
          p_address: formData.address,
          p_date_time_start: startDateTime.toISOString(),
          p_date_time_end: endDateTime.toISOString(),
          p_notes: formData.notes || null,
          p_home_id: null,
        }
      ) as { data: any; error: any };

      if (bookingError) throw bookingError;

      if (!result?.success) {
        toast({
          title: "Scheduling Conflict",
          description: result?.error || "This time slot is already booked",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Job created successfully",
        description: `${formData.service_name} scheduled for ${clientMode === "new" ? newClientData.name : selectedClient?.name}`,
      });

      // Reset form
      setFormData({
        service_name: "",
        scheduled_date: undefined,
        duration: "1",
        status: "scheduled",
        quote_amount: "",
        notes: "",
        address: "",
      });
      setNewClientData({ name: "", email: "", phone: "", address: "" });
      setSelectedClient(null);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Job creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>
              Schedule a service appointment for a client
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Client Mode Toggle */}
              {!preSelectedClient && (
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={clientMode === "existing" ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => setClientMode("existing")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Existing Client
                  </Button>
                  <Button
                    type="button"
                    variant={clientMode === "new" ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => setClientMode("new")}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    New Client
                  </Button>
                </div>
              )}

              {/* Existing Client Selection */}
              {clientMode === "existing" && (
                <div>
                  <Label htmlFor="client">Select Client *</Label>
                  <Select
                    value={selectedClient?.id || ""}
                    onValueChange={(value) => {
                      const client = clients.find((c) => c.id === value);
                      setSelectedClient(client || null);
                    }}
                    disabled={loadingClients}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* New Client Form */}
              {clientMode === "new" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">New Client Information</h4>
                  
                  <div>
                    <Label htmlFor="client_name">Name *</Label>
                    <Input
                      id="client_name"
                      value={newClientData.name}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, name: e.target.value })
                      }
                      placeholder="John Smith"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="client_email">Email *</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={newClientData.email}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="client_phone">Phone</Label>
                    <Input
                      id="client_phone"
                      type="tel"
                      value={newClientData.phone}
                      onChange={(e) =>
                        setNewClientData({ ...newClientData, phone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="client_address">Address *</Label>
                    <AddressAutocomplete
                      onAddressSelect={(address) => {
                        setNewClientData({ ...newClientData, address: address.fullAddress });
                        setFormData({ ...formData, address: address.fullAddress });
                      }}
                      defaultValue={newClientData.address}
                      placeholder="123 Main St, City, State"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Job Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Job Details</h4>

                <div>
                  <Label htmlFor="service_name">Service *</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    placeholder="e.g., Lawn Mowing, Gutter Cleaning"
                    required
                  />
                </div>

                <div>
                  <Label>Date & Time *</Label>
                  <DateTimePicker
                    date={formData.scheduled_date}
                    onDateChange={(date) =>
                      setFormData({ ...formData, scheduled_date: date })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Estimated Duration</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) =>
                      setFormData({ ...formData, duration: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">30 minutes</SelectItem>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="8">Full day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {clientMode === "existing" && (
                  <div>
                    <Label htmlFor="address">Job Address *</Label>
                    <AddressAutocomplete
                      onAddressSelect={(address) =>
                        setFormData({ ...formData, address: address.fullAddress })
                      }
                      defaultValue={formData.address}
                      placeholder="Job location"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quote_amount">Quote Amount ($)</Label>
                  <Input
                    id="quote_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quote_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, quote_amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional details about this job..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
