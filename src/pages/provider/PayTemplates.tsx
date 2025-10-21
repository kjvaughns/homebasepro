import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PayTemplate {
  id: string;
  name: string;
  service_type: string | null;
  pay_type: string;
  pay_rule: any;
  is_default: boolean;
  active: boolean;
}

export default function PayTemplates() {
  const [templates, setTemplates] = useState<PayTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PayTemplate | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    service_type: "",
    pay_type: "percentage",
    flat_amount: "",
    hourly_rate: "",
    percentage: "70",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("team_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;

      setOrganizationId(member.organization_id);

      const { data, error } = await (supabase as any)
        .from("pay_templates")
        .select("*")
        .eq("organization_id", member.organization_id)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load pay templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      let pay_rule: any = {};

      if (formData.pay_type === "flat") {
        pay_rule = { flat_amount: parseFloat(formData.flat_amount) * 100 };
      } else if (formData.pay_type === "hourly") {
        pay_rule = { hourly_rate: parseFloat(formData.hourly_rate) * 100 };
      } else if (formData.pay_type === "percentage") {
        pay_rule = { percentage: parseFloat(formData.percentage) };
      }

      const templateData = {
        organization_id: organizationId,
        name: formData.name,
        service_type: formData.service_type || null,
        pay_type: formData.pay_type,
        pay_rule,
        active: true,
      };

      if (editingTemplate) {
        const { error } = await (supabase as any)
          .from("pay_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;

        toast({ title: "Success", description: "Template updated" });
      } else {
        const { error } = await (supabase as any)
          .from("pay_templates")
          .insert(templateData);

        if (error) throw error;

        toast({ title: "Success", description: "Template created" });
      }

      setShowDialog(false);
      setEditingTemplate(null);
      setFormData({
        name: "",
        service_type: "",
        pay_type: "percentage",
        flat_amount: "",
        hourly_rate: "",
        percentage: "70",
      });
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: PayTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      service_type: template.service_type || "",
      pay_type: template.pay_type,
      flat_amount: template.pay_rule.flat_amount ? (template.pay_rule.flat_amount / 100).toString() : "",
      hourly_rate: template.pay_rule.hourly_rate ? (template.pay_rule.hourly_rate / 100).toString() : "",
      percentage: template.pay_rule.percentage ? template.pay_rule.percentage.toString() : "70",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("pay_templates")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Template deleted" });
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const getPayRuleDisplay = (template: PayTemplate) => {
    if (template.pay_type === "flat") {
      return `$${(template.pay_rule.flat_amount / 100).toFixed(2)} per job`;
    } else if (template.pay_type === "hourly") {
      return `$${(template.pay_rule.hourly_rate / 100).toFixed(2)}/hr`;
    } else if (template.pay_type === "percentage") {
      return `${template.pay_rule.percentage}% of job total`;
    }
    return "";
  };

  if (loading) {
    return <div className="p-8 text-center">Loading pay templates...</div>;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pay Templates</h1>
          <p className="text-sm text-muted-foreground">
            Define default pay rules for different service types
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No pay templates created yet
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.service_type || "All Services"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{template.pay_type}</Badge>
                  </div>
                </div>
                <p className="text-sm mb-4">{getPayRuleDisplay(template)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Pay Template" : "Create Pay Template"}
            </DialogTitle>
            <DialogDescription>
              Define how team members are compensated for specific services
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Lead Tech - HVAC Install"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Service Type (Optional)</Label>
              <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Apply to all services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Services</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Lawn Care">Lawn Care</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pay Type</Label>
              <Select value={formData.pay_type} onValueChange={(v) => setFormData({ ...formData, pay_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Rate per Job</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="percentage">Percentage of Job Total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.pay_type === "flat" && (
              <div>
                <Label>Flat Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="100.00"
                  value={formData.flat_amount}
                  onChange={(e) => setFormData({ ...formData, flat_amount: e.target.value })}
                />
              </div>
            )}

            {formData.pay_type === "hourly" && (
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  placeholder="35.00"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
              </div>
            )}

            {formData.pay_type === "percentage" && (
              <div>
                <Label>Percentage of Job Total (%)</Label>
                <Input
                  type="number"
                  placeholder="70"
                  min="0"
                  max="100"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
