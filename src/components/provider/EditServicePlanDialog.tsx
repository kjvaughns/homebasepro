import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, X } from "lucide-react";
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

interface ServicePlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_frequency: string;
  service_type: string[] | null;
  is_active: boolean;
  is_recurring: boolean;
  includes_features: string[];
}

interface EditServicePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  plan: ServicePlan | null;
}

export function EditServicePlanDialog({
  open,
  onOpenChange,
  onSuccess,
  plan,
}: EditServicePlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billing_frequency: "monthly",
    service_type: [] as string[],
    is_active: true,
    is_recurring: true,
    includes_features: [] as string[],
  });
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || "",
        price: (plan.price / 100).toFixed(2),
        billing_frequency: plan.billing_frequency,
        service_type: plan.service_type || [],
        is_active: plan.is_active,
        is_recurring: plan.is_recurring ?? true,
        includes_features: plan.includes_features || [],
      });
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("service_plans")
        .update({
          name: formData.name,
          description: formData.description || null,
          price: Math.round(parseFloat(formData.price) * 100),
          billing_frequency: formData.billing_frequency,
          service_type: formData.service_type || null,
          is_active: formData.is_active,
          is_recurring: formData.is_recurring,
          includes_features: formData.includes_features,
        })
        .eq("id", plan.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service plan updated successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        title: "Error",
        description: "Failed to update service plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!plan || !confirm("Delete this service plan? This cannot be undone."))
      return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("service_plans")
        .delete()
        .eq("id", plan.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service plan deleted successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete service plan",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Service Plan</DialogTitle>
            <DialogDescription>
              Update your service offering details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
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
              <Label htmlFor="service_type">Service Categories (comma-separated)</Label>
              <Input
                id="service_type"
                value={formData.service_type.join(", ")}
                onChange={(e) =>
                  setFormData({ 
                    ...formData, 
                    service_type: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  })
                }
                placeholder="e.g., HVAC, Plumbing"
              />
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

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active Status</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
