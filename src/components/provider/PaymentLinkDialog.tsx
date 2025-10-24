import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";

interface PaymentLinkDialogProps {
  open: boolean;
  onClose: () => void;
  paymentUrl: string;
  clientName: string;
}

export function PaymentLinkDialog({ open, onClose, paymentUrl, clientName }: PaymentLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    setLoading(true);
    const result = await copyToClipboard(paymentUrl);
    setLoading(false);

    if (result.success) {
      setCopied(true);
      toast.success("Payment link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error("Failed to copy. Please copy manually from the field below.");
    }
  };

  const handleOpenLink = () => {
    window.open(paymentUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Link Created</DialogTitle>
          <DialogDescription>
            Share this payment link with {clientName} to collect payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Link</label>
            <div className="flex gap-2">
              <Input
                value={paymentUrl}
                readOnly
                className="font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleCopy}
              disabled={loading}
              className="flex-1"
              variant={copied ? "secondary" : "default"}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {loading ? "Copying..." : "Copy Link"}
                </>
              )}
            </Button>
            <Button
              onClick={handleOpenLink}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link
            </Button>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
            <p>💡 You can share this link via email, text message, or any other communication method.</p>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
