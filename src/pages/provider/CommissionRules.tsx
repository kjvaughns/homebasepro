import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";

interface CompRule {
  id: string;
  rule_type: string;
  service_type: string;
  amount: number;
  percent: number;
  cap: number;
  floor: number;
  active: boolean;
}

export default function CommissionRules() {
  const [rules, setRules] = useState<CompRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<CompRule | null>(null);
  const [formData, setFormData] = useState({
    rule_type: "percent",
    service_type: "",
    amount: "",
    percent: "",
    cap: "",
    floor: "",
    active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const orgQuery = await (supabase as any)
        .from("organizations")
        .select("id")
        .eq("owner_user_id", user.user.id)
        .single();

      if (!orgQuery.data) return;
      setOrganizationId(orgQuery.data.id);

      const { data: rulesData } = await (supabase as any)
        .from("comp_rules")
        .select("*")
        .eq("organization_id", orgQuery.data.id)
        .order("created_at", { ascending: false });

      setRules(rulesData || []);
    } catch (error) {
      console.error("Error loading commission rules:", error);
      toast({
        title: "Error",
        description: "Failed to load commission rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule?: CompRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        rule_type: rule.rule_type,
        service_type: rule.service_type || "",
        amount: rule.amount?.toString() || "",
        percent: rule.percent?.toString() || "",
        cap: rule.cap?.toString() || "",
        floor: rule.floor?.toString() || "",
        active: rule.active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        rule_type: "percent",
        service_type: "",
        amount: "",
        percent: "",
        cap: "",
        floor: "",
        active: true,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const ruleData: any = {
        organization_id: organizationId,
        rule_type: formData.rule_type,
        service_type: formData.service_type || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        percent: formData.percent ? parseFloat(formData.percent) : null,
        cap: formData.cap ? parseFloat(formData.cap) : null,
        floor: formData.floor ? parseFloat(formData.floor) : null,
        active: formData.active,
      };

      if (editingRule) {
        const { error } = await (supabase as any)
          .from("comp_rules")
          .update(ruleData)
          .eq("id", editingRule.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("comp_rules")
          .insert(ruleData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Commission rule ${editingRule ? "updated" : "created"}`,
      });

      setShowDialog(false);
      loadRules();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast({
        title: "Error",
        description: "Failed to save commission rule",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const { error } = await (supabase as any)
        .from("comp_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Commission rule deleted",
      });

      loadRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete commission rule",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Commission Rules</h1>
          <p className="text-sm text-muted-foreground">Configure commission and bonus structures</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No commission rules yet</h3>
            <p className="text-muted-foreground mb-4">
              Create rules to automatically calculate commissions and bonuses
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {rule.service_type || "All Services"}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {rule.rule_type.replace("_", " ")} commission
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={rule.active ? "default" : "secondary"}>
                    {rule.active ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {rule.amount && (
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-semibold">${rule.amount}</p>
                    </div>
                  )}
                  {rule.percent && (
                    <div>
                      <p className="text-muted-foreground">Percentage</p>
                      <p className="font-semibold">{rule.percent}%</p>
                    </div>
                  )}
                  {rule.cap && (
                    <div>
                      <p className="text-muted-foreground">Cap</p>
                      <p className="font-semibold">${rule.cap}</p>
                    </div>
                  )}
                  {rule.floor && (
                    <div>
                      <p className="text-muted-foreground">Floor</p>
                      <p className="font-semibold">${rule.floor}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit" : "Create"} Commission Rule</DialogTitle>
            <DialogDescription>
              Configure automatic commission calculations
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Rule Type</Label>
              <Select
                value={formData.rule_type}
                onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="per_job">Per Job</SelectItem>
                  <SelectItem value="spif">SPIF Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Service Type (Optional)</Label>
              <Input
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                placeholder="e.g., HVAC, Plumbing"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to apply to all services
              </p>
            </div>

            {formData.rule_type === "per_job" && (
              <div className="grid gap-2">
                <Label>Amount per Job ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="50.00"
                />
              </div>
            )}

            {(formData.rule_type === "percent" || formData.rule_type === "spif") && (
              <div className="grid gap-2">
                <Label>Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.percent}
                  onChange={(e) => setFormData({ ...formData, percent: e.target.value })}
                  placeholder="10.0"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cap ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cap}
                  onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                  placeholder="1000.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Floor ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="100.00"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingRule ? "Update" : "Create"} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}