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
import { Loader2, UserPlus, Users, Sparkles } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { Card } from "@/components/ui/card";

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
  phone?: string;
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
  const { isMobile } = useMobileLayout();
  const keyboardHeight = useKeyboardHeight();
  const [loading, setLoading] = useState(false);
  const [clientMode, setClientMode] = useState<ClientMode>(preSelectedClient ? "existing" : "new");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(preSelectedClient || null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [selectedParts, setSelectedParts] = useState<any[]>([]);
  const [aiQuote, setAiQuote] = useState<any>(null);
  const [loadingAiQuote, setLoadingAiQuote] = useState(false);
  
  const [formData, setFormData] = useState({
    service_name: "",
    scheduled_date: preSelectedDate || undefined as Date | undefined,
    duration: "1",
    status: "pending",
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

  // Load existing clients, services, and parts
  useEffect(() => {
    if (open && clientMode === "existing") {
      loadClients();
    }
    if (open) {
      loadServices();
      loadParts();
    }
  }, [open, clientMode]);

  // Pre-fill address when client is selected
  useEffect(() => {
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        address: selectedClient.address || ""
      }));
      setNewClientData({
        name: selectedClient.name || "",
        email: selectedClient.email || "",
        phone: selectedClient.phone || "",
        address: selectedClient.address || ""
      });
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

  const loadServices = async () => {
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
        .from("provider_services")
        .select("*")
        .eq("organization_id", org.id)
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error("Error loading services:", error);
    }
  };

  const loadParts = async () => {
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
        .from("parts_materials")
        .select("*")
        .eq("organization_id", org.id)
        .order("name");

      if (error) throw error;
      setParts(data || []);
    } catch (error: any) {
      console.error("Error loading parts:", error);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    if (serviceId === "custom") {
      setSelectedService(null);
      setFormData(prev => ({
        ...prev,
        service_name: "",
        quote_amount: "",
      }));
      setAiQuote(null);
      return;
    }

    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setFormData(prev => ({
        ...prev,
        service_name: service.name,
        quote_amount: service.default_price ? (service.default_price / 100).toFixed(2) : "",
        duration: service.estimated_duration_minutes ? Math.ceil(service.estimated_duration_minutes / 60).toString() : prev.duration,
      }));
      setAiQuote(null); // Clear previous AI quote when changing service
    }
  };

  const handleGetAIQuote = async () => {
    if (!selectedService || !selectedClient) {
      toast({
        title: "Missing information",
        description: "Please select both a service and a client first",
        variant: "destructive",
      });
      return;
    }

    setLoadingAiQuote(true);
    try {
      const { data, error } = await supabase.functions.invoke('assistant-provider', {
        body: {
          message: 'Generate quote for this job',
          context: {
            action: 'generate_job_quote',
            service_id: selectedService.id,
            service_name: formData.service_name,
            base_price: selectedService.default_price || 0,
            client_id: selectedClient.homeowner_profile_id,
            client_address: formData.address,
            parts_ids: [],
            custom_notes: formData.notes
          }
        }
      });

      if (error) throw error;

      // Extract quote from tool_results
      const quoteData = data.tool_results?.find((r: any) => 
        r.type === 'generate_job_quote'
      )?.data;

      if (quoteData) {
        setAiQuote(quoteData);
        toast({
          title: "AI quote generated",
          description: "Review the suggested pricing below",
        });
      } else {
        throw new Error("No quote data returned");
      }
    } catch (error: any) {
      console.error("AI quote error:", error);
      toast({
        title: "AI Quote Failed",
        description: error.message || "Failed to generate quote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingAiQuote(false);
    }
  };

  const handleAcceptAIQuote = () => {
    if (aiQuote) {
      setFormData(prev => ({
        ...prev,
        quote_amount: aiQuote.estimated_total?.toFixed(2) || prev.quote_amount
      }));
      toast({ 
        title: "AI quote applied",
        description: `Quote set to $${aiQuote.estimated_total?.toFixed(2)}`
      });
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

      let clientId = selectedClient?.id;

      // Create new client if needed
      if (clientMode === "new") {
        // Check for duplicate email
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
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

        // Create client record
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            organization_id: org.id,
            homeowner_profile_id: null,
            name: newClientData.name,
            email: newClientData.email.toLowerCase(),
            phone: newClientData.phone || null,
            address: newClientData.address,
            status: "active",
          })
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Create booking
      const startDateTime = formData.scheduled_date;
      const durationHours = parseFloat(formData.duration);
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);
      const quoteAmount = formData.quote_amount ? parseFloat(formData.quote_amount) * 100 : null;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          provider_org_id: org.id,
          client_id: clientId,
          homeowner_profile_id: selectedClient?.homeowner_profile_id || null,
          service_name: formData.service_name || 'Service',
          address: formData.address,
          date_time_start: startDateTime.toISOString(),
          date_time_end: endDateTime.toISOString(),
          status: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(formData.status) 
            ? formData.status 
            : 'pending',
          notes: formData.notes || null,
          estimated_price_low: quoteAmount,
          estimated_price_high: quoteAmount,
        })
        .select()
        .single();

      if (bookingError) {
        console.error("Booking creation error:", bookingError);
        throw bookingError;
      }

      // Send email notification if client has email
      const clientEmail = clientMode === "existing" 
        ? selectedClient?.email 
        : newClientData.email;

      if (clientEmail) {
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke('send-job-notification', {
            body: {
              bookingId: booking.id,
              type: 'job_created',
              clientEmail,
              providerOrgId: org.id
            }
          });

          if (fnError || fnData?.error) {
            console.error("Email notification error:", fnError || fnData?.error);
            toast({
              title: "Job created!",
              description: `${formData.service_name} scheduled, but email could not be sent.`,
              variant: "default",
            });
          } else {
            toast({
              title: "Job created!",
              description: `${formData.service_name} scheduled. Email sent to client.`,
            });
          }
        } catch (emailError) {
          console.error("Email notification error:", emailError);
          toast({
            title: "Job created!",
            description: `${formData.service_name} scheduled, but email could not be sent.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Job created!",
          description: `${formData.service_name} scheduled. No client email provided.`,
        });
      }

      // Reset form
      setFormData({
        service_name: "",
        scheduled_date: undefined,
        duration: "1",
        status: "pending",
        quote_amount: "",
        notes: "",
        address: "",
      });
      setNewClientData({ name: "", email: "", phone: "", address: "" });
      setSelectedClient(null);
      setSelectedService(null);
      setAiQuote(null);
      
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
      <DialogContent 
        className={`max-w-2xl flex flex-col p-0 ${
          isMobile ? 'h-[100dvh] max-h-[100dvh]' : 'max-h-[90vh]'
        }`}
        style={isMobile && keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight}px` } : undefined}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>
              Schedule a service appointment for a client
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 px-6 overflow-y-auto">
            <div className="space-y-6 pb-6">
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
                  <Label htmlFor="service">Service *</Label>
                  <Select
                    value={selectedService?.id || "custom"}
                    onValueChange={handleServiceSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service from your catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} {service.default_price ? `- $${(service.default_price / 100).toFixed(2)}` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Service (Manual Entry)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!selectedService && (
                  <div>
                    <Label htmlFor="service_name">Custom Service Name *</Label>
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
                )}

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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quote_amount">Quote Amount ($)</Label>
                    {selectedService && selectedClient && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGetAIQuote}
                        disabled={loadingAiQuote}
                      >
                        {loadingAiQuote ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" /> 
                            Get AI Quote
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {aiQuote && (
                    <Card className="p-4 bg-primary/5 border-primary/20">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">AI Suggested Price</span>
                          <span className="text-lg font-bold text-primary">
                            ${aiQuote.suggested_price_low?.toFixed(2)} - ${aiQuote.suggested_price_high?.toFixed(2)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">{aiQuote.justification}</p>
                        
                        {aiQuote.parts_breakdown && aiQuote.parts_breakdown.length > 0 && (
                          <div className="text-xs space-y-1 pt-2 border-t">
                            <div className="font-medium">Parts Breakdown:</div>
                            {aiQuote.parts_breakdown.map((part: any, i: number) => (
                              <div key={i} className="flex justify-between">
                                <span>{part.name}</span>
                                <span>${part.cost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {aiQuote.service_base && (
                          <div className="text-xs space-y-1 pt-2 border-t">
                            <div className="flex justify-between">
                              <span>Service Base:</span>
                              <span>${aiQuote.service_base.toFixed(2)}</span>
                            </div>
                            {aiQuote.parts_total > 0 && (
                              <div className="flex justify-between">
                                <span>Parts Total:</span>
                                <span>${aiQuote.parts_total.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium">
                              <span>Estimated Total:</span>
                              <span>${aiQuote.estimated_total?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="w-full mt-2"
                          onClick={handleAcceptAIQuote}
                        >
                          Accept AI Quote
                        </Button>
                      </div>
                    </Card>
                  )}

                  <Input
                    id="quote_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quote_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, quote_amount: e.target.value })
                    }
                    placeholder="Enter quote amount or use AI suggestion"
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
          </div>

          <DialogFooter className="px-6 py-4 shrink-0 border-t">
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
