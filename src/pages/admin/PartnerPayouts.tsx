import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Send, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminPartnerPayouts() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [stats, setStats] = useState({ totalPending: 0, partnersReady: 0 });

  useEffect(() => {
    loadPayouts();
    loadPreview();
  }, []);

  const loadPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_payouts')
        .select(`
          *,
          partners (business_name, referral_code)
        `)
        .order('payout_date', { ascending: false });

      if (error) throw error;

      setPayouts(data || []);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast({
        title: "Error loading payouts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    try {
      // Get active partners with Connect accounts
      const { data: partners } = await supabase
        .from('partners')
        .select('*')
        .eq('status', 'ACTIVE')
        .not('stripe_account_id', 'is', null);

      const previewData = [];
      let totalPending = 0;
      let partnersReady = 0;

      for (const partner of partners || []) {
        const { data: commissions } = await supabase
          .from('partner_commissions')
          .select('amount')
          .eq('partner_id', partner.id)
          .eq('status', 'PENDING');

        const pendingAmount = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;

        if (pendingAmount > 0) {
          totalPending += pendingAmount;
          partnersReady++;
          
          previewData.push({
            partner,
            pendingAmount,
            ready: true,
            reason: null,
          });
        }
      }

      setPreview(previewData);
      setStats({ totalPending, partnersReady });
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  };

  const runPayouts = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('partner-payout-manual', {
        body: {}
      });

      if (error) throw error;

      const results = data.results || [];
      const successful = results.filter((r: any) => r.status === 'success').length;
      const failed = results.filter((r: any) => r.status === 'failed').length;

      toast({
        title: "Payouts processed",
        description: `${successful} successful, ${failed} failed`,
      });

      loadPayouts();
      loadPreview();
    } catch (error: any) {
      toast({
        title: "Error processing payouts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowConfirmDialog(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      COMPLETED: <Badge className="bg-green-500">Completed</Badge>,
      PENDING: <Badge className="bg-yellow-500">Pending</Badge>,
      FAILED: <Badge variant="destructive">Failed</Badge>,
    };
    return variants[status] || <Badge>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partner Payouts</h1>
        <p className="text-muted-foreground">Manage monthly commission payouts to partners</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Partners Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partnersReady}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={processing || stats.partnersReady === 0}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Run Payouts Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead>Ready?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.partner.business_name || item.partner.contact_name}
                      <br />
                      <code className="text-xs text-muted-foreground">
                        {item.partner.referral_code}
                      </code>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${item.pendingAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.ready ? (
                        <Badge className="bg-green-500">Ready</Badge>
                      ) : (
                        <Badge variant="destructive">{item.reason}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transfer ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    {new Date(payout.payout_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {payout.partners?.business_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${payout.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{payout.stripe_transfer_id || 'N/A'}</code>
                  </TableCell>
                  <TableCell>{getStatusBadge(payout.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {payouts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No payouts yet
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Payouts Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will process ${stats.totalPending.toFixed(2)} in payouts to {stats.partnersReady} partners.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runPayouts} disabled={processing}>
              {processing ? 'Processing...' : 'Confirm Payout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
