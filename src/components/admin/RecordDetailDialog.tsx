import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatColumnName } from "@/constants/tableMetadata";
import { Trash2, Loader2 } from "lucide-react";

interface RecordDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
  tableName: string;
  columns: string[];
  onSuccess: () => void;
  onDelete?: () => void;
}

const RecordDetailDialog = ({
  open,
  onOpenChange,
  record,
  tableName,
  columns,
  onSuccess,
  onDelete,
}: RecordDetailDialogProps) => {
  const [formData, setFormData] = useState(record);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { id, ...updateData } = formData;
      const { error } = await supabase
        .from(tableName as any)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      await supabase.from("admin_activity_log").insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "update",
        table_name: tableName,
        record_id: id,
        details: { updated_fields: Object.keys(updateData) },
      });

      toast({
        title: "Success",
        description: "Record updated successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error updating record:", error);
      toast({
        title: "Error",
        description: "Failed to update record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      await supabase.from("admin_activity_log").insert({
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "delete",
        table_name: tableName,
        record_id: record.id,
      });

      toast({
        title: "Success",
        description: "Record deleted successfully",
      });
      
      onOpenChange(false);
      if (onDelete) onDelete();
      onSuccess();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderInput = (column: string, value: any) => {
    if (column === "id") {
      return (
        <Input
          value={value || ""}
          disabled
          className="bg-muted"
        />
      );
    }

    if (typeof value === "boolean" || column.toLowerCase().includes("enabled")) {
      return (
        <Switch
          checked={formData[column] || false}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, [column]: checked })
          }
        />
      );
    }

    if (typeof value === "number" || column.toLowerCase().includes("amount") || column.toLowerCase().includes("price")) {
      return (
        <Input
          type="number"
          value={formData[column] || ""}
          onChange={(e) =>
            setFormData({ ...formData, [column]: Number(e.target.value) })
          }
        />
      );
    }

    if (typeof value === "object" && value !== null) {
      return (
        <Textarea
          value={JSON.stringify(formData[column], null, 2)}
          onChange={(e) => {
            try {
              setFormData({ ...formData, [column]: JSON.parse(e.target.value) });
            } catch {
              // Invalid JSON, keep as string
            }
          }}
          rows={4}
          className="font-mono text-xs"
        />
      );
    }

    if (String(value).length > 100 || column.toLowerCase().includes("description") || column.toLowerCase().includes("notes")) {
      return (
        <Textarea
          value={formData[column] || ""}
          onChange={(e) =>
            setFormData({ ...formData, [column]: e.target.value })
          }
          rows={3}
        />
      );
    }

    return (
      <Input
        value={formData[column] || ""}
        onChange={(e) =>
          setFormData({ ...formData, [column]: e.target.value })
        }
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Record Details</DialogTitle>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {columns.map((column) => (
              <div key={column} className="space-y-2">
                <Label htmlFor={column} className="text-sm font-medium">
                  {formatColumnName(column)}
                </Label>
                {renderInput(column, record[column])}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordDetailDialog;
