import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CancellationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentPlan: string;
}

const cancellationReasons = [
  "Too expensive",
  "Not using enough",
  "Missing features",
  "Found better alternative",
  "Business closing",
  "Other"
];

export function CancellationFlow({ open, onOpenChange, onSuccess, currentPlan }: CancellationFlowProps) {
  const [step, setStep] = useState<'reason' | 'alternatives' | 'confirm'>('reason');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'cancel-subscription',
          reason,
          feedback
        }
      });

      if (error) throw error;

      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of the current billing period"
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setStep('reason');
    setReason('');
    setFeedback('');
  };

  const canDowngrade = currentPlan !== 'growth';

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'reason' && "Why are you cancelling?"}
            {step === 'alternatives' && "Have you considered?"}
            {step === 'confirm' && "Confirm Cancellation"}
          </DialogTitle>
          <DialogDescription>
            {step === 'reason' && "Help us improve by sharing your feedback"}
            {step === 'alternatives' && "We have options that might work better"}
            {step === 'confirm' && "Your subscription will end at the current billing period"}
          </DialogDescription>
        </DialogHeader>

        {step === 'reason' && (
          <div className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason}>
              {cancellationReasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r}>{r}</Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more..."
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 'alternatives' && (
          <div className="space-y-4">
            {canDowngrade && (
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">Downgrade to Growth Plan</h4>
                <p className="text-sm text-muted-foreground">
                  Keep essential features at $49/month
                </p>
                <Button variant="outline" className="w-full">
                  Switch to Growth
                </Button>
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">Take a Break</h4>
              <p className="text-sm text-muted-foreground">
                Pause for 1-3 months and keep your data
              </p>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-orange-900 dark:text-orange-100">
                    What happens when you cancel:
                  </p>
                  <ul className="space-y-1 text-orange-700 dark:text-orange-300">
                    <li>• Access until end of billing period</li>
                    <li>• All data retained for 30 days</li>
                    <li>• Transaction fees increase to 8%</li>
                    <li>• Team members removed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Keep Subscription
          </Button>
          
          {step === 'reason' && (
            <Button
              onClick={() => setStep('alternatives')}
              disabled={!reason || processing}
            >
              Continue
            </Button>
          )}
          
          {step === 'alternatives' && (
            <Button
              onClick={() => setStep('confirm')}
              variant="destructive"
              disabled={processing}
            >
              Still Cancel
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button
              onClick={handleCancel}
              variant="destructive"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
