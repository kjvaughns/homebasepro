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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface ServicePlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_frequency: string;
  service_type: string | null;
  is_active: boolean;
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billing_frequency: "monthly",
    service_type: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || "",
        price: (plan.price / 100).toString(),
        billing_frequency: plan.billing_frequency,
        service_type: plan.service_type || "",
        is_active: plan.is_active,
      });
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    
    setLoading(true);

    try {
      const priceInCents = Math.round(parseFloat(formData.price) * 100);

      const { error } = await supabase
        .from("service_plans")
        .update({
          name: formData.name,
          description: formData.description || null,
          price: priceInCents,
          billing_frequency: formData.billing_frequency,
          service_type: formData.service_type || null,
          is_active: formData.is_active,
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
    if (!plan) return;
    if (!confirm("Are you sure you want to delete this service plan?")) return;

    setLoading(true);

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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Service Plan</DialogTitle>
            <DialogDescription>
              Update your service plan details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-plan-name">Plan Name *</Label>
              <Input
                id="edit-plan-name"
                placeholder="e.g., Lawn Care Monthly"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-plan-description">Description</Label>
              <Textarea
                id="edit-plan-description"
                placeholder="Describe what's included..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-plan-price">Price *</Label>
              <Input
                id="edit-plan-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-plan-frequency">Billing Frequency *</Label>
              <Select
                value={formData.billing_frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, billing_frequency: value })
                }
              >
                <SelectTrigger id="edit-plan-frequency">
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
              <Label htmlFor="edit-plan-type">Service Type</Label>
              <Input
                id="edit-plan-type"
                placeholder="e.g., Lawn Care, HVAC, Plumbing"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-plan-active">Active</Label>
              <Switch
                id="edit-plan-active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
