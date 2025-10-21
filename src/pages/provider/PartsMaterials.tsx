import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Trash2, TrendingUp } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

interface Part {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  cost_price: number;
  markup_percentage: number;
  sell_price: number;
  supplier: string | null;
  quantity_on_hand: number;
  unit: string;
  is_active: boolean;
}

export default function PartsMaterials() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    cost_price: 0,
    markup_percentage: 50,
    sell_price: 0,
    supplier: "",
    quantity_on_hand: 0,
    unit: "each",
    is_active: true,
  });

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    // Auto-calculate sell price based on cost and markup
    const calculatedPrice = formData.cost_price * (1 + formData.markup_percentage / 100);
    if (formData.sell_price !== calculatedPrice) {
      setFormData(prev => ({ ...prev, sell_price: calculatedPrice }));
    }
  }, [formData.cost_price, formData.markup_percentage]);

  const loadParts = async () => {
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
        .from("parts_materials")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error("Error loading parts:", error);
      toast.error("Failed to load parts & materials");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        name: part.name,
        sku: part.sku || "",
        category: part.category || "",
        cost_price: part.cost_price / 100,
        markup_percentage: part.markup_percentage,
        sell_price: part.sell_price / 100,
        supplier: part.supplier || "",
        quantity_on_hand: part.quantity_on_hand,
        unit: part.unit,
        is_active: part.is_active,
      });
    } else {
      setEditingPart(null);
      setFormData({
        name: "",
        sku: "",
        category: "",
        cost_price: 0,
        markup_percentage: 50,
        sell_price: 0,
        supplier: "",
        quantity_on_hand: 0,
        unit: "each",
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      const partData = {
        ...formData,
        cost_price: Math.round(formData.cost_price * 100),
        sell_price: Math.round(formData.sell_price * 100),
        organization_id: organizationId,
      };

      if (editingPart) {
        const { error } = await supabase
          .from("parts_materials")
          .update(partData)
          .eq("id", editingPart.id);

        if (error) throw error;
        toast.success("Part updated successfully");
      } else {
        const { error } = await supabase
          .from("parts_materials")
          .insert([partData]);

        if (error) throw error;
        toast.success("Part created successfully");
      }

      setDialogOpen(false);
      loadParts();
    } catch (error) {
      console.error("Error saving part:", error);
      toast.error("Failed to save part");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this part?")) return;

    try {
      const { error } = await supabase
        .from("parts_materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Part deleted successfully");
      loadParts();
    } catch (error) {
      console.error("Error deleting part:", error);
      toast.error("Failed to delete part");
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parts & Materials</h1>
          <p className="text-muted-foreground">Manage pricing for parts and materials</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {parts.map((part) => (
          <Card key={part.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <CardTitle className="text-lg">{part.name}</CardTitle>
                </div>
                <Badge variant={part.is_active ? "default" : "secondary"}>
                  {part.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {part.sku && (
                <CardDescription>SKU: {part.sku}</CardDescription>
              )}
              {part.category && !part.sku && (
                <CardDescription>{part.category}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">${(part.cost_price / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Markup:</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-medium">{part.markup_percentage}%</span>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Sell Price:</span>
                  <span className="font-bold">${(part.sell_price / 100).toFixed(2)}</span>
                </div>
                {part.quantity_on_hand > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>In Stock:</span>
                    <span>{part.quantity_on_hand} {part.unit}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(part)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(part.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {parts.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No parts or materials yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first part to start tracking pricing
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPart ? "Edit Part/Material" : "Add New Part/Material"}
            </DialogTitle>
            <DialogDescription>
              Define pricing for parts and materials you use in jobs
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Part Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Air Filter, PVC Pipe"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sku">SKU/Part Number</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., HVAC Parts, Plumbing"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost Price ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="markup">Markup (%)</Label>
                <Input
                  id="markup"
                  type="number"
                  value={formData.markup_percentage}
                  onChange={(e) => setFormData({ ...formData, markup_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="50"
                  step="1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sell">Sell Price ($)</Label>
                <Input
                  id="sell"
                  type="number"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity on Hand</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity_on_hand}
                  onChange={(e) => setFormData({ ...formData, quantity_on_hand: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="each"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active Part</Label>
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
              {editingPart ? "Update" : "Create"} Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
