import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import QRCode from 'qrcode';

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
  const [qrCode, setQRCode] = useState<string>("");

  useEffect(() => {
    if (generatedLink) {
      QRCode.toDataURL(generatedLink, { width: 256 }).then(setQRCode).catch(console.error);
    }
  }, [generatedLink]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call payment API to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'payment-link',
          clientId,
          jobId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          type: 'payment_link'
        }
      });

      if (error) {
        console.error("Payment link error:", error);
        const errorMsg = error.message || "Failed to create payment link";
        toast.error(errorMsg);
        return;
      }

      if (!data?.url) {
        toast.error("Payment link creation failed: No URL returned");
        return;
      }

      setGeneratedLink(data.url);
      toast.success("Payment link created!");
    } catch (error: any) {
      console.error("Error creating payment link:", error);
      const errorDetails = error.details || error.message || "Failed to create payment link";
      toast.error(errorDetails);
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
    setQRCode("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Payment Link</DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-4">
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

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading || !formData.amount} className="flex-1">
                {loading ? "Creating..." : "Create Link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              {qrCode && (
                <img src={qrCode} alt="Payment QR Code" className="w-64 h-64 rounded-lg border" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Link</Label>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs font-mono" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Share this link or QR code with your client for secure payment
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