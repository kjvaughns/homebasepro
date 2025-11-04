import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Zap, 
  Loader2, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  RefreshCw,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { PayoutTimingCalculator } from './PayoutTimingCalculator';

interface PayoutInfo {
  balance: {
    available: number;
    pending: number;
    currency: string;
  };
  payoutSchedule: {
    interval: string;
    delayDays: number;
  };
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    arrivalDate: number;
    type: string;
    created: number;
  }>;
  instantPayouts: {
    enabled: boolean;
    reason: string | null;
  };
  bankAccount: {
    last4: string;
    bankName: string;
  } | null;
}

export function FinancialOverview() {
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPayoutInfo();
    const interval = setInterval(loadPayoutInfo, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadPayoutInfo = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true);
      
      const { data, error } = await supabase.functions.invoke('get-payout-info');

      if (error) throw error;
      setPayoutInfo(data);
    } catch (error: any) {
      console.error('Failed to load payout info:', error);
      if (error.message !== 'Stripe account not connected') {
        toast({
          title: 'Failed to load data',
          description: 'Unable to fetch payout information',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    const available = (payoutInfo?.balance.available || 0) / 100;

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
      const { error } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'instant-payout',
          amount,
        },
      });

      if (error) throw error;

      toast({
        title: 'Payout initiated',
        description: `$${amount.toFixed(2)} will arrive in ~30 minutes`,
      });

      setShowPayoutDialog(false);
      setPayoutAmount('');
      loadPayoutInfo();
    } catch (error: any) {
      toast({
        title: 'Payout failed',
        description: error.message || 'Failed to process instant payout',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'express-dashboard' }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open Stripe dashboard',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      paid: { variant: "default", label: "Paid" },
      pending: { variant: "secondary", label: "Pending" },
      in_transit: { variant: "outline", label: "In Transit" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payoutInfo) {
    return (
      <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Stripe Not Connected
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to view balance and payout information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={openStripeDashboard}>
            Connect Stripe Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  const availableAmount = payoutInfo.balance.available / 100;
  const pendingAmount = payoutInfo.balance.pending / 100;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadPayoutInfo(true)}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              ${availableAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected in {payoutInfo.payoutSchedule.delayDays}-5 business days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Schedule & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Payout Schedule
              </CardTitle>
              <CardDescription className="mt-1">
                {payoutInfo.payoutSchedule.interval === 'daily' ? 'Daily' : 
                 payoutInfo.payoutSchedule.interval === 'weekly' ? 'Weekly' : 
                 payoutInfo.payoutSchedule.interval === 'monthly' ? 'Monthly' : 'Manual'} payouts
                {' • '}
                {payoutInfo.payoutSchedule.delayDays} business day delay
              </CardDescription>
            </div>
            {payoutInfo.bankAccount && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                {payoutInfo.bankAccount.bankName} ••••{payoutInfo.bankAccount.last4}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instant Payout Option */}
          {payoutInfo.instantPayouts.enabled && availableAmount > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">Instant Payout Available</div>
                  <div className="text-sm text-muted-foreground">
                    Get funds in ~30 minutes (1.5% fee)
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowPayoutDialog(true)}
                className="w-full"
                size="lg"
              >
                <Zap className="mr-2 h-4 w-4" />
                Request Instant Payout
              </Button>
            </div>
          )}

          {!payoutInfo.instantPayouts.enabled && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Instant Payouts Not Enabled</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {payoutInfo.instantPayouts.reason || 'Add a debit card in Stripe Dashboard'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={openStripeDashboard}
            className="w-full"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Stripe Dashboard
          </Button>
        </CardContent>
      </Card>

      {/* Payout Timing Calculator */}
      <PayoutTimingCalculator delayDays={payoutInfo.payoutSchedule.delayDays} />

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>Your payout history from the last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          {payoutInfo.payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No payouts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutInfo.payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {payout.type === 'instant' ? (
                      <Zap className="h-5 w-5 text-primary" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">
                        ${(payout.amount / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payout.arrivalDate * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(payout.status)}
                    {payout.type === 'instant' && (
                      <Badge variant="outline" className="text-xs">Instant</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instant Payout Dialog */}
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
    </div>
  );
}
