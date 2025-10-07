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

interface Subscription {
  id: string;
  clients: { name: string };
  service_plans: { name: string; price: number };
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedSubscriptionId?: string;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedSubscriptionId,
}: RecordPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [feePercent, setFeePercent] = useState(0);
  const [formData, setFormData] = useState({
    subscription_id: preSelectedSubscriptionId || "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
      if (preSelectedSubscriptionId) {
        setFormData((prev) => ({
          ...prev,
          subscription_id: preSelectedSubscriptionId,
        }));
      }
    }
  }, [open, preSelectedSubscriptionId]);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      // Load organization's subscription to get fee percent
      const { data: orgSub } = await supabase
        .from("organization_subscriptions")
        .select("plan_tier")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .single();

      if (orgSub) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("transaction_fee_percent")
          .eq("tier", orgSub.plan_tier)
          .single();

        if (plan) {
          setFeePercent(Number(plan.transaction_fee_percent));
        }
      }

      // Load active subscriptions
      const { data: subsData } = await supabase
        .from("client_subscriptions")
        .select(
          `
          id,
          clients!inner (name, organization_id),
          service_plans (name, price)
        `
        )
        .eq("clients.organization_id", organization.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setSubscriptions(subsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const selectedSubscription = subscriptions.find(
    (s) => s.id === formData.subscription_id
  );
  const amount = selectedSubscription?.service_plans.price || 0;
  const feeAmount = Math.round(amount * (feePercent / 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("payments").insert({
        client_subscription_id: formData.subscription_id,
        amount,
        fee_amount: feeAmount,
        fee_percent: feePercent,
        payment_date: new Date(formData.payment_date).toISOString(),
        status: "completed",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setFormData({
        subscription_id: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
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
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Log a payment received from a client
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Subscription *</Label>
              <Select
                value={formData.subscription_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, subscription_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subscription" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.clients.name} - {sub.service_plans.name} ($
                      {(sub.service_plans.price / 100).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSubscription && (
              <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    ${(amount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Platform Fee ({feePercent}%):
                  </span>
                  <span className="font-medium text-destructive">
                    -${(feeAmount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>You Receive:</span>
                  <span>${((amount - feeAmount) / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any additional notes about this payment"
                rows={3}
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
            <Button
              type="submit"
              disabled={loading || !formData.subscription_id}
            >
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
