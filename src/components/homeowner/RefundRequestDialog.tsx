import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RefundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  homeownerProfileId: string;
  providerOrgId: string;
  bookingAmount: number;
  onSuccess: () => void;
}

const REFUND_REASONS = [
  "Service not completed",
  "Poor quality work",
  "Provider canceled",
  "Service not as described",
  "Billing error",
  "Other",
];

export function RefundRequestDialog({
  open,
  onOpenChange,
  bookingId,
  homeownerProfileId,
  providerOrgId,
  bookingAmount,
  onSuccess,
}: RefundRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason for the refund request");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("refund_requests").insert({
        booking_id: bookingId,
        homeowner_profile_id: homeownerProfileId,
        provider_org_id: providerOrgId,
        amount_requested: bookingAmount,
        reason: notes ? `${reason}: ${notes}` : reason,
      });

      if (error) throw error;

      toast.success("Refund request submitted successfully");
      onOpenChange(false);
      onSuccess();
      setReason("");
      setNotes("");
    } catch (error) {
      console.error("Error submitting refund request:", error);
      toast.error("Failed to submit refund request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Submit a refund request for this appointment. The provider will review your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for refund</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Provide any additional information about your refund request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              Refund amount: <span className="font-semibold text-foreground">${(bookingAmount / 100).toFixed(2)}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
