import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RefundDialogProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RefundDialog({ payment, open, onOpenChange, onSuccess }: RefundDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const maxAmount = (payment.amount || 0) / 100;

  const [formData, setFormData] = useState({
    amount: maxAmount.toString(),
    reason: "requested_by_customer",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'refund',
          paymentId: payment.id,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
        },
      });

      if (error) throw error;

      toast({
        title: "Refund processed",
        description: `$${formData.amount} refunded successfully`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action cannot be undone. The refund will be processed immediately.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Payment</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">
                {payment.meta?.client_name || "Client"} - ${maxAmount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(payment.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Refund Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum: ${maxAmount.toFixed(2)}
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                <SelectItem value="duplicate">Duplicate charge</SelectItem>
                <SelectItem value="fraudulent">Fraudulent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Internal notes about this refund..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1" variant="destructive">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Refund
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}