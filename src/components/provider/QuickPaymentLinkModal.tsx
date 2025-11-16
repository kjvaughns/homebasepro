import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";

interface QuickPaymentLinkModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickPaymentLinkModal({ open, onClose }: QuickPaymentLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!amount || parseFloat(amount) < 0.5) {
      toast.error("Amount must be at least $0.50");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id, stripe_account_id, stripe_onboarding_complete")
        .eq("owner_id", user.id)
        .single();

      if (!org || !org.stripe_account_id || !org.stripe_onboarding_complete) {
        toast.error("Please complete Stripe Connect setup in Settings > Payments");
        setLoading(false);
        return;
      }

      const amountCents = Math.round(parseFloat(amount) * 100);

      // Create invoice without client
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          organization_id: org.id,
          amount: amountCents,
          description: description || "Payment Request",
          status: "open",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invoice_number: `INV-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Create Stripe payment link
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-invoice', {
        body: {
          invoiceId: invoice.id,
          amount: amountCents,
          description: description || "Payment Request",
          stripeAccountId: org.stripe_account_id,
        },
      });

      if (stripeError) throw stripeError;

      setPaymentLink(stripeData.paymentUrl);
      toast.success("Payment link created!");
    } catch (error) {
      console.error('Generate link error:', error);
      toast.error("Failed to generate payment link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(paymentLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setPaymentLink("");
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Create Quick Payment Link
          </DialogTitle>
        </DialogHeader>

        {!paymentLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.50"
                placeholder="100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this payment for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">You'll receive:</p>
              <p className="text-2xl font-bold text-primary">
                ${amount ? (parseFloat(amount) * 0.971).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                After 2.9% + $0.30 processing fee
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  value={paymentLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Payment link created! Share this link via text, email, or any messaging app.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!paymentLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating..." : "Generate Link"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
