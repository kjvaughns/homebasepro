import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useMobileLayout } from "@/hooks/useMobileLayout";

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricing_type: string | null;
  default_price: number | null;
  estimated_duration_minutes: number | null;
  is_active: boolean;
  is_recurring: boolean;
  billing_frequency: string | null;
  includes_features: string[];
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();
  const { isMobile } = useMobileLayout();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    pricing_type: "flat",
    default_price: "",
    estimated_duration_minutes: "",
    is_active: true,
    is_recurring: false,
    billing_frequency: "monthly",
    includes_features: [] as string[],
  });

  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
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
        .from("services")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices((data || []) as Service[]);
    } catch (error) {
      console.error("Error loading services:", error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || "",
        category: service.category || "",
        pricing_type: service.pricing_type || "flat",
        default_price: service.default_price ? (service.default_price / 100).toString() : "",
        estimated_duration_minutes: service.estimated_duration_minutes?.toString() || "",
        is_active: service.is_active,
        is_recurring: service.is_recurring,
        billing_frequency: service.billing_frequency || "monthly",
        includes_features: service.includes_features || [],
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        category: "",
        pricing_type: "flat",
        default_price: "",
        estimated_duration_minutes: "",
        is_active: true,
        is_recurring: false,
        billing_frequency: "monthly",
        includes_features: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      const serviceData = {
        organization_id: organization.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        pricing_type: formData.pricing_type,
        default_price: formData.default_price ? Math.round(parseFloat(formData.default_price) * 100) : null,
        estimated_duration_minutes: formData.estimated_duration_minutes ? parseInt(formData.estimated_duration_minutes) : null,
        is_active: formData.is_active,
        is_recurring: formData.is_recurring,
        billing_frequency: formData.is_recurring ? formData.billing_frequency : null,
        includes_features: formData.is_recurring ? formData.includes_features : [],
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast({ title: "Success", description: "Service updated successfully" });
      } else {
        const { error } = await supabase
          .from("services")
          .insert([serviceData]);

        if (error) throw error;
        toast({ title: "Success", description: "Service created successfully" });
      }

      setDialogOpen(false);
      loadServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Service deleted successfully" });
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        includes_features: [...prev.includes_features, newFeature.trim()]
      }));
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      includes_features: prev.includes_features.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div className="p-8 text-center">Loading services...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 pb-safe">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Services</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage one-time services and recurring subscriptions
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="touch-manipulation">
          <Plus className="mr-2 h-4 w-4" />
          Create Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first service to start offering to clients
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Service
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="cursor-pointer hover:shadow-lg transition-shadow touch-manipulation"
              onClick={() => handleOpenDialog(service)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{service.name}</CardTitle>
                  <div className="flex gap-2">
                    {service.is_recurring && (
                      <Badge variant="secondary">Recurring</Badge>
                    )}
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${service.default_price ? (service.default_price / 100).toFixed(2) : "0.00"}
                  </div>
                  {service.is_recurring && service.billing_frequency && (
                    <div className="text-sm text-muted-foreground">
                      per {service.billing_frequency}
                    </div>
                  )}
                  {service.category && (
                    <Badge variant="outline">{service.category}</Badge>
                  )}
                  {service.estimated_duration_minutes && (
                    <div className="text-sm text-muted-foreground">
                      Est. {service.estimated_duration_minutes} min
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isMobile ? (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>
                {editingService ? "Edit Service" : "Create New Service"}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 mt-4 overflow-y-auto pb-20" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AC Tune-up, Lawn Care"
                  className="touch-manipulation"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service..."
                  className="touch-manipulation"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., HVAC, Plumbing"
                    className="touch-manipulation"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={formData.default_price}
                    onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                    placeholder="0.00"
                    className="touch-manipulation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="pricing_type">Pricing Type</Label>
                  <Select
                    value={formData.pricing_type}
                    onValueChange={(value) => setFormData({ ...formData, pricing_type: value })}
                  >
                    <SelectTrigger className="touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="per_unit">Per Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Est. Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    inputMode="numeric"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                    placeholder="60"
                    className="touch-manipulation"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
                <Label htmlFor="recurring">Recurring Subscription Service</Label>
              </div>

              {formData.is_recurring && (
                <>
                  <div>
                    <Label htmlFor="billing_frequency">Billing Frequency</Label>
                    <Select
                      value={formData.billing_frequency}
                      onValueChange={(value) => setFormData({ ...formData, billing_frequency: value })}
                    >
                      <SelectTrigger className="touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Included Features</Label>
                    <div className="space-y-2">
                      {formData.includes_features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input value={feature} disabled className="flex-1" />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFeature(index)}
                            className="touch-manipulation"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature..."
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                          className="flex-1 touch-manipulation"
                        />
                        <Button type="button" onClick={addFeature} className="touch-manipulation">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                {editingService && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setDialogOpen(false);
                      handleDelete(editingService.id);
                    }}
                    className="w-full touch-manipulation"
                  >
                    Delete
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 touch-manipulation">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="flex-1 touch-manipulation">
                    {editingService ? "Save Changes" : "Create Service"}
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Create New Service"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AC Tune-up, Lawn Care"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., HVAC, Plumbing"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.default_price}
                    onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricing_type">Pricing Type</Label>
                  <Select
                    value={formData.pricing_type}
                    onValueChange={(value) => setFormData({ ...formData, pricing_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="per_unit">Per Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Est. Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
                <Label htmlFor="recurring">Recurring Subscription Service</Label>
              </div>

              {formData.is_recurring && (
                <>
                  <div>
                    <Label htmlFor="billing_frequency">Billing Frequency</Label>
                    <Select
                      value={formData.billing_frequency}
                      onValueChange={(value) => setFormData({ ...formData, billing_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Included Features</Label>
                    <div className="space-y-2">
                      {formData.includes_features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input value={feature} disabled />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFeature(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature..."
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                        />
                        <Button type="button" onClick={addFeature}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <div className="flex justify-between gap-2 pt-4">
                <div>
                  {editingService && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setDialogOpen(false);
                        handleDelete(editingService.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingService ? "Save Changes" : "Create Service"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
