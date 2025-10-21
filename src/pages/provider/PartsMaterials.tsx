import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AIPartsSuggestionDialog } from "@/components/provider/AIPartsSuggestionDialog";
import { useMobileLayout } from "@/hooks/useMobileLayout";

interface Part {
  id: string;
  name: string;
  sku: string;
  category: string;
  cost_price: number;
  markup_percentage: number;
  sell_price: number;
  quantity_on_hand: number;
  unit: string;
  is_active: boolean;
}

export default function PartsMaterials() {
  const { toast } = useToast();
  const { isMobile } = useMobileLayout();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    cost_price: 0,
    markup_percentage: 50,
    sell_price: 0,
    quantity_on_hand: 0,
    unit: "each",
    is_active: true,
  });

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    const sellPrice = formData.cost_price * (1 + formData.markup_percentage / 100);
    setFormData((prev) => ({ ...prev, sell_price: sellPrice }));
  }, [formData.cost_price, formData.markup_percentage]);

  const loadParts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!orgData) return;

      const { data, error } = await supabase
        .from("parts_materials")
        .select("*")
        .eq("organization_id", orgData.id)
        .order("name");

      if (error) throw error;
      setParts(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading parts",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        name: part.name,
        sku: part.sku,
        category: part.category,
        cost_price: part.cost_price / 100,
        markup_percentage: part.markup_percentage,
        sell_price: part.sell_price / 100,
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
        quantity_on_hand: 0,
        unit: "each",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!orgData) return;

      const partData = {
        ...formData,
        organization_id: orgData.id,
        cost_price: Math.round(formData.cost_price * 100),
        sell_price: Math.round(formData.sell_price * 100),
      };

      if (editingPart) {
        const { error } = await supabase
          .from("parts_materials")
          .update(partData)
          .eq("id", editingPart.id);
        if (error) throw error;
        toast({ title: "Part updated successfully" });
      } else {
        const { error } = await supabase.from("parts_materials").insert(partData);
        if (error) throw error;
        toast({ title: "Part added successfully" });
      }

      setIsDialogOpen(false);
      loadParts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving part",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this part?")) return;

    try {
      const { error } = await supabase.from("parts_materials").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Part deleted successfully" });
      loadParts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting part",
        description: error.message,
      });
    }
  };

  const handleAISuggest = async () => {
    setIsLoadingAI(true);
    setIsAIDialogOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-parts-materials");

      if (error) {
        if (error.message?.includes("429")) {
          throw new Error("Rate limit exceeded. Please try again in a few moments.");
        }
        if (error.message?.includes("402")) {
          throw new Error("Please add credits to your Lovable AI workspace to continue.");
        }
        throw error;
      }

      setAiSuggestions(data.parts || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "AI Suggestion Error",
        description: error.message,
      });
      setIsAIDialogOpen(false);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleImportParts = async (selectedParts: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!orgData) return;

      const partsToInsert = selectedParts.map((part) => ({
        ...part,
        organization_id: orgData.id,
        cost_price: Math.round(part.cost_price * 100),
        sell_price: Math.round(part.sell_price * 100),
        quantity_on_hand: 0,
      }));

      const { error } = await supabase.from("parts_materials").insert(partsToInsert);
      if (error) throw error;

      toast({
        title: "Parts imported successfully",
        description: `Added ${selectedParts.length} parts to your inventory`,
      });

      loadParts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error importing parts",
        description: error.message,
      });
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Part Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="touch-manipulation"
          />
        </div>
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="touch-manipulation"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="touch-manipulation"
          />
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="touch-manipulation"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="cost_price">Cost Price</Label>
          <Input
            id="cost_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={formData.cost_price}
            onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
            className="touch-manipulation"
          />
        </div>
        <div>
          <Label htmlFor="markup">Markup %</Label>
          <Input
            id="markup"
            type="number"
            inputMode="decimal"
            value={formData.markup_percentage}
            onChange={(e) => setFormData({ ...formData, markup_percentage: parseFloat(e.target.value) || 0 })}
            className="touch-manipulation"
          />
        </div>
        <div>
          <Label htmlFor="sell_price">Sell Price</Label>
          <Input
            id="sell_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={formData.sell_price.toFixed(2)}
            readOnly
            className="bg-muted touch-manipulation"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity on Hand</Label>
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            value={formData.quantity_on_hand}
            onChange={(e) => setFormData({ ...formData, quantity_on_hand: parseInt(e.target.value) || 0 })}
            className="touch-manipulation"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label>Active</Label>
        </div>
      </div>
    </div>
  );

  const formFooter = (
    <div className="flex gap-2 pt-4">
      <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 touch-manipulation">
        Cancel
      </Button>
      <Button onClick={handleSave} className="flex-1 touch-manipulation">
        {editingPart ? "Update" : "Add"} Part
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 pb-safe">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Parts & Materials</h1>
        <div className="flex gap-2">
          <Button onClick={handleAISuggest} variant="outline" className="touch-manipulation flex-1 sm:flex-none">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Suggest
          </Button>
          <Button onClick={() => handleOpenDialog()} className="touch-manipulation flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Add Part
          </Button>
        </div>
      </div>

      {parts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No parts added yet</p>
          <Button onClick={() => handleOpenDialog()} className="touch-manipulation">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Part
          </Button>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {parts.map((part) => (
            <Card
              key={part.id}
              className="p-4 touch-manipulation cursor-pointer"
              onClick={() => handleOpenDialog(part)}
            >
              <h3 className="font-semibold">{part.name}</h3>
              <p className="text-sm text-muted-foreground">{part.category}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Cost: ${(part.cost_price / 100).toFixed(2)}</span>
                <span className="text-sm font-medium text-primary">Sell: ${(part.sell_price / 100).toFixed(2)}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Markup</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>{part.sku}</TableCell>
                    <TableCell>{part.category}</TableCell>
                    <TableCell>${(part.cost_price / 100).toFixed(2)}</TableCell>
                    <TableCell>{part.markup_percentage}%</TableCell>
                    <TableCell className="font-medium">${(part.sell_price / 100).toFixed(2)}</TableCell>
                    <TableCell>{part.quantity_on_hand}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(part)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(part.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {isMobile ? (
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>{editingPart ? "Edit" : "Add"} Part</SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              {formContent}
            </div>
            <SheetFooter className="mt-4">{formFooter}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPart ? "Edit" : "Add"} Part</DialogTitle>
            </DialogHeader>
            {formContent}
            <DialogFooter>{formFooter}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AIPartsSuggestionDialog
        open={isAIDialogOpen}
        onOpenChange={setIsAIDialogOpen}
        suggestions={aiSuggestions}
        onImport={handleImportParts}
        isLoading={isLoadingAI}
      />
    </div>
  );
}
