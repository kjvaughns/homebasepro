import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Clock, DollarSign, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing_type: 'flat' | 'hourly' | 'per_unit';
  default_price: number;
  estimated_duration_minutes: number;
  is_active: boolean;
}

export default function ServiceCatalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    pricing_type: "flat" as 'flat' | 'hourly' | 'per_unit',
    default_price: 0,
    estimated_duration_minutes: 60,
    is_active: true,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;
      setOrganizationId(org.id);

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices((data as Service[]) || []);
    } catch (error) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
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
        pricing_type: service.pricing_type,
        default_price: service.default_price / 100,
        estimated_duration_minutes: service.estimated_duration_minutes || 60,
        is_active: service.is_active,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        category: "",
        pricing_type: "flat",
        default_price: 0,
        estimated_duration_minutes: 60,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      const serviceData = {
        ...formData,
        default_price: Math.round(formData.default_price * 100),
        organization_id: organizationId,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Service updated successfully");
      } else {
        const { error } = await supabase
          .from("services")
          .insert([serviceData]);

        if (error) throw error;
        toast.success("Service created successfully");
      }

      setDialogOpen(false);
      loadServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Service deleted successfully");
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Catalog</h1>
          <p className="text-muted-foreground">Manage your standard services and pricing</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                </div>
                <Badge variant={service.is_active ? "default" : "secondary"}>
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {service.category && (
                <CardDescription>{service.category}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {service.description && (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    ${(service.default_price / 100).toFixed(2)}
                    {service.pricing_type === 'hourly' && '/hr'}
                    {service.pricing_type === 'per_unit' && '/unit'}
                  </span>
                </div>
                
                {service.estimated_duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.estimated_duration_minutes}min</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(service)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <Card className="p-12 text-center">
          <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first service to get started
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              Define a standard service that you offer to clients
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AC Tune-up, Drain Cleaning"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., HVAC, Plumbing, Electrical"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this service includes"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pricing_type">Pricing Type</Label>
                <Select
                  value={formData.pricing_type}
                  onValueChange={(value: any) => setFormData({ ...formData, pricing_type: value })}
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

              <div className="grid gap-2">
                <Label htmlFor="price">Default Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.default_price}
                  onChange={(e) => setFormData({ ...formData, default_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                placeholder="60"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active Service</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingService ? "Update" : "Create"} Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
