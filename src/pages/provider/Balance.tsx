import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, ArrowUpRight, Loader2, DollarSign, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Balance {
  available: number;
  pending: number;
  currency: string;
}

export default function Balance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance>({ available: 0, pending: 0, currency: "usd" });
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  useEffect(() => {
    loadBalance();
    const interval = setInterval(loadBalance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("payments-api", {
        body: { action: "get_balance" },
      });

      if (error) throw error;
      if (data?.balance) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
      toast({
        title: "Error",
        description: "Failed to load balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInstantPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount",
        variant: "destructive",
      });
      return;
    }

    const amountInCents = Math.round(parseFloat(payoutAmount) * 100);
    if (amountInCents > balance.available) {
      toast({
        title: "Insufficient Balance",
        description: "Payout amount exceeds available balance",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayout(true);
    try {
      const { data, error } = await supabase.functions.invoke("payments-api", {
        body: {
          action: "instant_payout",
          amount: amountInCents,
          currency: balance.currency,
        },
      });

      if (error) throw error;

      toast({
        title: "Payout Initiated",
        description: `$${payoutAmount} is being transferred to your bank account`,
      });

      setPayoutDialogOpen(false);
      setPayoutAmount("");
      loadBalance();
    } catch (error: any) {
      console.error("Payout error:", error);
      toast({
        title: "Payout Failed",
        description: error.message || "Failed to process payout",
        variant: "destructive",
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableAmount = (balance.available / 100).toFixed(2);
  const pendingAmount = (balance.pending / 100).toFixed(2);
  const fee = (parseFloat(payoutAmount || "0") * 0.015).toFixed(2);
  const netAmount = (parseFloat(payoutAmount || "0") - parseFloat(fee)).toFixed(2);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Balance & Payouts</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your funds and request payouts
        </p>
      </div>

      {/* Balance Overview Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${availableAmount}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ready to withdraw
            </p>
            {balance.available > 0 && (
              <Button
                size="sm"
                className="mt-4 w-full"
                onClick={() => setPayoutDialogOpen(true)}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Request Instant Payout
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              ${pendingAmount}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Processing payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Information</CardTitle>
          <CardDescription>How payouts work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Instant Payouts</p>
                <p className="text-muted-foreground">
                  Transfer available funds to your bank account instantly for a 1.5% fee
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Standard Payouts</p>
                <p className="text-muted-foreground">
                  Automatic daily payouts at no additional fee (arrives in 1-2 business days)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Instant Payout</DialogTitle>
            <DialogDescription>
              Transfer funds to your connected bank account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-7"
                  max={(balance.available / 100).toString()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum: ${availableAmount}
              </p>
            </div>

            {payoutAmount && parseFloat(payoutAmount) > 0 && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>Payout Amount</span>
                  <span className="font-medium">${parseFloat(payoutAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Instant Payout Fee (1.5%)</span>
                  <span>-${fee}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>You'll Receive</span>
                  <span>${netAmount}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutDialogOpen(false)}
              disabled={processingPayout}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInstantPayout}
              disabled={processingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0}
            >
              {processingPayout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Request Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
