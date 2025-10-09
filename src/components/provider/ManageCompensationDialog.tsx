import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ManageCompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMemberId: string;
  organizationId: string;
  currentCompensation?: {
    id: string;
    pay_type: string;
    pay_rate: number;
    direct_deposit_enabled: boolean;
    bank_account_last4?: string;
  };
  onSuccess: () => void;
}

export function ManageCompensationDialog({
  open,
  onOpenChange,
  teamMemberId,
  organizationId,
  currentCompensation,
  onSuccess,
}: ManageCompensationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payType, setPayType] = useState(currentCompensation?.pay_type || "hourly");
  const [payRate, setPayRate] = useState(currentCompensation?.pay_rate?.toString() || "");
  const [directDepositEnabled, setDirectDepositEnabled] = useState(
    currentCompensation?.direct_deposit_enabled || false
  );
  const [bankLast4, setBankLast4] = useState(currentCompensation?.bank_account_last4 || "");

  const handleSave = async () => {
    if (!payRate || parseFloat(payRate) <= 0) {
      toast({
        title: "Invalid pay rate",
        description: "Please enter a valid pay rate",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const compensationData = {
        team_member_id: teamMemberId,
        organization_id: organizationId,
        pay_type: payType,
        pay_rate: parseFloat(payRate),
        direct_deposit_enabled: directDepositEnabled,
        bank_account_last4: bankLast4 || null,
      };

      if (currentCompensation?.id) {
        const { error } = await supabase
          .from("team_member_compensation")
          .update(compensationData)
          .eq("id", currentCompensation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_member_compensation")
          .insert(compensationData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Compensation updated successfully",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving compensation:", error);
      toast({
        title: "Error",
        description: "Failed to save compensation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Compensation</DialogTitle>
          <DialogDescription>
            Set pay rate and direct deposit information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pay Type</Label>
            <Select value={payType} onValueChange={setPayType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pay Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={payRate}
              onChange={(e) => setPayRate(e.target.value)}
              placeholder={payType === "hourly" ? "25.00" : "50000"}
            />
            <p className="text-xs text-muted-foreground">
              {payType === "hourly" ? "Per hour" : payType === "salary" ? "Per year" : "Percentage"}
            </p>
          </div>

          <div className="flex items-center justify-between space-y-2">
            <div>
              <Label>Direct Deposit</Label>
              <p className="text-xs text-muted-foreground">
                Enable direct deposit payments
              </p>
            </div>
            <Switch
              checked={directDepositEnabled}
              onCheckedChange={setDirectDepositEnabled}
            />
          </div>

          {directDepositEnabled && (
            <div className="space-y-2">
              <Label>Bank Account (Last 4 digits)</Label>
              <Input
                type="text"
                maxLength={4}
                value={bankLast4}
                onChange={(e) => setBankLast4(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
              />
              <p className="text-xs text-muted-foreground">
                For display purposes only. Full account details stored securely.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}