import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const SERVICE_CATEGORIES = [
  "Lawn Care",
  "Pool Maintenance",
  "HVAC Service",
  "House Cleaning",
  "Pest Control",
  "Landscaping",
  "Plumbing",
  "Electrical",
  "Other",
];

interface AddServicePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddServicePlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddServicePlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billing_frequency: "monthly",
    service_type: "",
    is_recurring: true,
    includes_features: [] as string[],
  });
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) throw new Error("Organization not found");

      const { error } = await supabase.from("service_plans").insert({
        organization_id: organization.id,
        name: formData.name,
        description: formData.description || null,
        price: Math.round(parseFloat(formData.price) * 100),
        billing_frequency: formData.billing_frequency,
        service_type: formData.service_type || null,
        is_active: true,
        is_recurring: formData.is_recurring,
        includes_features: formData.includes_features,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service plan created successfully",
      });

      setFormData({
        name: "",
        description: "",
        price: "",
        billing_frequency: "monthly",
        service_type: "",
        is_recurring: true,
        includes_features: [],
      });
      setNewFeature("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating plan:", error);
      toast({
        title: "Error",
        description: "Failed to create service plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Service Plan</DialogTitle>
            <DialogDescription>
              Define a new service offering for your clients
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Lawn Care"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what's included in this plan"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billing_frequency">Billing Frequency *</Label>
              <Select
                value={formData.billing_frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, billing_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service_type">Service Category</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, service_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_recurring">Recurring Subscription</Label>
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_recurring: checked })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Features Included</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newFeature.trim()) {
                        setFormData({
                          ...formData,
                          includes_features: [
                            ...formData.includes_features,
                            newFeature.trim(),
                          ],
                        });
                        setNewFeature("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newFeature.trim()) {
                      setFormData({
                        ...formData,
                        includes_features: [
                          ...formData.includes_features,
                          newFeature.trim(),
                        ],
                      });
                      setNewFeature("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {formData.includes_features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.includes_features.map((feature, index) => (
                    <Badge key={index} variant="secondary">
                      {feature}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            includes_features:
                              formData.includes_features.filter(
                                (_, i) => i !== index
                              ),
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
