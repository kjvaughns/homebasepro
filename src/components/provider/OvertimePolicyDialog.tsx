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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface OvertimePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  policy?: {
    id: string;
    name: string;
    state_code: string;
    daily_ot_hours: number;
    weekly_ot_hours: number;
    double_time_hours: number;
    ot_multiplier: number;
    double_time_multiplier: number;
  };
  onSuccess: () => void;
}

const STATE_TEMPLATES = {
  CA: { name: "California", daily: 8, weekly: 40, doubleTime: 12, otMult: 1.5, dtMult: 2.0 },
  NY: { name: "New York", daily: 0, weekly: 40, doubleTime: 0, otMult: 1.5, dtMult: 2.0 },
  TX: { name: "Texas", daily: 0, weekly: 40, doubleTime: 0, otMult: 1.5, dtMult: 2.0 },
  FL: { name: "Florida", daily: 0, weekly: 40, doubleTime: 0, otMult: 1.5, dtMult: 2.0 },
  CUSTOM: { name: "Custom", daily: 8, weekly: 40, doubleTime: 12, otMult: 1.5, dtMult: 2.0 },
};

export function OvertimePolicyDialog({
  open,
  onOpenChange,
  organizationId,
  policy,
  onSuccess,
}: OvertimePolicyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: policy?.name || "",
    state_code: policy?.state_code || "CUSTOM",
    daily_ot_hours: policy?.daily_ot_hours?.toString() || "8",
    weekly_ot_hours: policy?.weekly_ot_hours?.toString() || "40",
    double_time_hours: policy?.double_time_hours?.toString() || "12",
    ot_multiplier: policy?.ot_multiplier?.toString() || "1.5",
    double_time_multiplier: policy?.double_time_multiplier?.toString() || "2.0",
  });
  const { toast } = useToast();

  const handleStateChange = (stateCode: string) => {
    const template = STATE_TEMPLATES[stateCode as keyof typeof STATE_TEMPLATES];
    setFormData({
      name: `${template.name} Overtime Policy`,
      state_code: stateCode,
      daily_ot_hours: template.daily.toString(),
      weekly_ot_hours: template.weekly.toString(),
      double_time_hours: template.doubleTime.toString(),
      ot_multiplier: template.otMult.toString(),
      double_time_multiplier: template.dtMult.toString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const policyData = {
        organization_id: organizationId,
        name: formData.name,
        state_code: formData.state_code,
        daily_ot_hours: parseFloat(formData.daily_ot_hours),
        weekly_ot_hours: parseFloat(formData.weekly_ot_hours),
        double_time_hours: parseFloat(formData.double_time_hours),
        ot_multiplier: parseFloat(formData.ot_multiplier),
        double_time_multiplier: parseFloat(formData.double_time_multiplier),
        active: true,
      };

      if (policy?.id) {
        const { error } = await (supabase as any)
          .from("overtime_policies")
          .update(policyData)
          .eq("id", policy.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("overtime_policies")
          .insert(policyData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Overtime policy ${policy ? "updated" : "created"} successfully`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving overtime policy:", error);
      toast({
        title: "Error",
        description: "Failed to save overtime policy",
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
            <DialogTitle>{policy ? "Edit" : "Create"} Overtime Policy</DialogTitle>
            <DialogDescription>
              Configure overtime rules and multipliers
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="state">State Template</Label>
              <Select value={formData.state_code} onValueChange={handleStateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Policy Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Default Overtime Policy"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="daily_ot">Daily OT (hours)</Label>
                <Input
                  id="daily_ot"
                  type="number"
                  step="0.5"
                  value={formData.daily_ot_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, daily_ot_hours: e.target.value })
                  }
                  placeholder="8"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="weekly_ot">Weekly OT (hours)</Label>
                <Input
                  id="weekly_ot"
                  type="number"
                  step="0.5"
                  value={formData.weekly_ot_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, weekly_ot_hours: e.target.value })
                  }
                  placeholder="40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="double_time">Double Time (hours)</Label>
                <Input
                  id="double_time"
                  type="number"
                  step="0.5"
                  value={formData.double_time_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, double_time_hours: e.target.value })
                  }
                  placeholder="12"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ot_mult">OT Multiplier</Label>
                <Input
                  id="ot_mult"
                  type="number"
                  step="0.1"
                  value={formData.ot_multiplier}
                  onChange={(e) =>
                    setFormData({ ...formData, ot_multiplier: e.target.value })
                  }
                  placeholder="1.5"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dt_mult">Double Time Multiplier</Label>
              <Input
                id="dt_mult"
                type="number"
                step="0.1"
                value={formData.double_time_multiplier}
                onChange={(e) =>
                  setFormData({ ...formData, double_time_multiplier: e.target.value })
                }
                placeholder="2.0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}