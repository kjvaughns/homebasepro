import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Zap, Loader2, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Balance {
  available: number;
  pending: number;
  currency: string;
}

export function BalanceWidget() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBalance();
    const interval = setInterval(loadBalance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'provider-balance' },
      });

      if (error) throw error;
      setBalance(data);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleInstantPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payout amount',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(payoutAmount);
    const available = (balance?.available || 0) / 100;

    if (amount > available) {
      toast({
        title: 'Insufficient balance',
        description: 'Payout amount exceeds available balance',
        variant: 'destructive',
      });
      return;
    }

    setProcessingPayout(true);

    try {
      // Check instant payout eligibility first
      const { data: eligibility } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'check-payout-eligibility' }
      });

      if (eligibility && !eligibility.eligible) {
        toast({
          title: 'Instant payouts not available',
          description: eligibility.reason || 'Standard payouts will arrive in 2-3 business days',
          variant: 'default',
        });
        setShowPayoutDialog(false);
        return;
      }

      const { error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'instant-payout',
          amount,
        },
      });

      if (error) throw error;

      toast({
        title: 'Payout initiated',
        description: `$${amount.toFixed(2)} will arrive in minutes`,
      });

      setShowPayoutDialog(false);
      setPayoutAmount('');
      loadBalance();
    } catch (error: any) {
      console.error('Payout error:', error);
      
      // Parse specific error messages
      let errorMessage = error.message || 'Failed to process instant payout';
      
      if (errorMessage.includes('insufficient_funds')) {
        errorMessage = 'Insufficient balance for payout';
      } else if (errorMessage.includes('account_not_verified')) {
        errorMessage = 'Complete account verification to enable payouts';
      } else if (errorMessage.includes('payout_limit_exceeded')) {
        errorMessage = 'Payout limit exceeded. Try a smaller amount or wait 24 hours';
      }

      toast({
        title: 'Payout failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const availableAmount = (balance?.available || 0) / 100;
  const pendingAmount = (balance?.pending || 0) / 100;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncing && <div className="animate-pulse h-2 w-2 bg-primary rounded-full" />}
            <DollarSign className="h-5 w-5" />
            Balance
          </CardTitle>
          <CardDescription>Your account balance and payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadBalance}
                  className="h-6 px-2"
                >
                  Refresh
                </Button>
              </div>
              <div className="text-3xl font-bold text-primary">
                ${availableAmount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready to withdraw
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Pending</span>
              <div className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                ${pendingAmount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Arrives in 2-5 business days after payment
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Payment Timeline:</p>
              <p>• Customer pays → Funds pending</p>
              <p>• 2 business days → Funds available</p>
              <p>• Standard payout → Bank in 2-3 days (free)</p>
              <p>• Instant payout → Bank in 30 min (1.5% fee)</p>
            </div>
          </div>

          {availableAmount > 0 && (
            <Button
              onClick={() => setShowPayoutDialog(true)}
              className="w-full"
              size="lg"
            >
              <Zap className="mr-2 h-4 w-4" />
              Instant Payout
            </Button>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Standard payouts: Free, arrives in 2-5 days</p>
            <p>• Instant payouts: 1.5% fee, arrives in minutes</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instant Payout</DialogTitle>
            <DialogDescription>
              Transfer funds to your debit card instantly (1.5% fee)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableAmount}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Available: ${availableAmount.toFixed(2)}
              </p>
            </div>

            {payoutAmount && parseFloat(payoutAmount) > 0 && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Amount</span>
                  <span>${parseFloat(payoutAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fee (1.5%)</span>
                  <span>
                    ${(parseFloat(payoutAmount) * 0.015).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>You receive</span>
                  <span>
                    ${(parseFloat(payoutAmount) * 0.985).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayoutDialog(false)}
              disabled={processingPayout}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInstantPayout}
              disabled={processingPayout || !payoutAmount}
            >
              {processingPayout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Confirm Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
