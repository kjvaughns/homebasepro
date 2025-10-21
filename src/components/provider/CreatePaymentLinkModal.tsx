import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface CreatePaymentLinkModalProps {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  jobId?: string;
}

export function CreatePaymentLinkModal({ open, onClose, clientId, jobId }: CreatePaymentLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    requireDeposit: false,
    depositAmount: "",
    expiresIn: "7",
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expiresIn));

      const { data, error } = await (supabase as any)
        .from("payment_links")
        .insert({
          organization_id: org.id,
          client_id: clientId,
          job_id: jobId,
          description: formData.description,
          amount: parseInt(formData.amount),
          deposit_required: formData.requireDeposit,
          deposit_amount: formData.requireDeposit ? parseInt(formData.depositAmount) : null,
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/pay/${data.id}`;
      setGeneratedLink(link);

      toast.success("Payment link created!");
    } catch (error) {
      console.error("Error creating payment link:", error);
      toast.error("Failed to create payment link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleClose = () => {
    setFormData({
      description: "",
      amount: "",
      requireDeposit: false,
      depositAmount: "",
      expiresIn: "7",
    });
    setGeneratedLink(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Link</DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Service description"
              />
            </div>

            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="100.00"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Require Deposit</Label>
              <Switch
                checked={formData.requireDeposit}
                onCheckedChange={(checked) => setFormData({ ...formData, requireDeposit: checked })}
              />
            </div>

            {formData.requireDeposit && (
              <div className="space-y-2">
                <Label>Deposit Amount ($)</Label>
                <Input
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                  placeholder="25.00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Link Expires In (Days)</Label>
              <Input
                type="number"
                value={formData.expiresIn}
                onChange={(e) => setFormData({ ...formData, expiresIn: e.target.value })}
                placeholder="7"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Payment Link Created!</p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Share this link with your client. They can pay via card and the payment will be tracked automatically.
            </p>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
