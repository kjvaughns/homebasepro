import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  record: any;
  columns: string[];
  onSuccess: () => void;
}

const EditRecordDialog = ({ open, onOpenChange, tableName, record, columns, onSuccess }: EditRecordDialogProps) => {
  const [formData, setFormData] = useState<any>(record);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from(tableName as any)
        .update(formData)
        .eq("id", record.id);

      if (error) throw error;

      // Log admin activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_user_id: user?.id,
        action: "update",
        table_name: tableName,
        record_id: record.id,
        details: { changes: formData },
      });

      toast({
        title: "Record updated",
        description: "The record has been successfully updated.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating record",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (column: string, value: any) => {
    // Skip id column
    if (column === "id") return null;

    const inputType = typeof value;

    if (inputType === "boolean") {
      return (
        <div key={column} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={column}>{column}</Label>
            <Switch
              id={column}
              checked={formData[column] || false}
              onCheckedChange={(checked) => setFormData({ ...formData, [column]: checked })}
            />
          </div>
        </div>
      );
    }

    if (inputType === "object" && value !== null) {
      return (
        <div key={column} className="space-y-2">
          <Label htmlFor={column}>{column}</Label>
          <Textarea
            id={column}
            value={JSON.stringify(formData[column], null, 2)}
            onChange={(e) => {
              try {
                setFormData({ ...formData, [column]: JSON.parse(e.target.value) });
              } catch {
                // Invalid JSON, keep as string
              }
            }}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={column} className="space-y-2">
        <Label htmlFor={column}>{column}</Label>
        <Input
          id={column}
          type={inputType === "number" ? "number" : "text"}
          value={formData[column] ?? ""}
          onChange={(e) => setFormData({ ...formData, [column]: e.target.value })}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {columns.map((col) => renderInput(col, record[col]))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecordDialog;

