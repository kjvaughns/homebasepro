import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, Receipt, TrendingUp, Plus, RefreshCw, Link2, Clock, Wallet, Copy, Send, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateInvoiceModal } from "@/components/provider/CreateInvoiceModal";
import { PaymentDrawer } from "@/components/provider/PaymentDrawer";
import { EnhancedMetricCard } from "@/components/provider/EnhancedMetricCard";
import { WeeklySnapshot } from "@/components/provider/WeeklySnapshot";
import { QuickPaymentLinkModal } from "@/components/provider/QuickPaymentLinkModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDespia } from "@/hooks/useDespia";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast as sonnerToast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";

export default function Money() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { triggerHaptic, showSpinner, hideSpinner } = useDespia();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enhancedMetrics, setEnhancedMetrics] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'owed');
  const [dateFilter, setDateFilter] = useState<'week' | 'lastWeek' | 'all'>('all');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const { toast } = useToast();

  const loadData = async (): Promise<void> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        return;
      }

      const orgResponse = await supabase.from('organizations').select('*').eq('owner_id', user.id).single();
      if (!orgResponse.data) return;
      
      const orgId = orgResponse.data.id;
      setOrganization(orgResponse.data);
      setStripeConnected(!!orgResponse.data.stripe_account_id);

      // Load metrics with explicit auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        toast({
          title: "Session expired",
          description: "Please refresh the page to continue.",
          variant: "destructive"
        });
        return;
      }

      const metricsResponse = await supabase.functions.invoke('get-enhanced-metrics', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (metricsResponse.error) {
        console.error('Metrics error:', metricsResponse.error);
        toast({
          title: "Failed to load metrics",
          description: "Unable to fetch financial data. Please try again.",
          variant: "destructive"
        });
        return;
      }
      setEnhancedMetrics(metricsResponse.data);
      
      // Load invoices
      // @ts-ignore - Supabase type inference issue
      const invoicesResponse: any = await supabase.from('invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
      const invoicesList = invoicesResponse.data || [];
      
      // Load client details for invoices
      const invoicesWithClients: any[] = [];
      for (const inv of invoicesList) {
        if (inv.client_id) {
          // @ts-ignore - Supabase type inference issue
          const clientResp: any = await supabase.from('clients').select('name, email').eq('id', inv.client_id).single();
          invoicesWithClients.push({ ...inv, client: clientResp.data });
        } else {
          invoicesWithClients.push(inv);
        }
      }
      setInvoices(invoicesWithClients);
      
      // Load payments
      // @ts-ignore - Supabase type inference issue
      const paymentsResponse: any = await supabase.from('payments').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
      setPayments(paymentsResponse.data || []);
      
      // Load transactions
      // @ts-ignore - Supabase type inference issue
      const transactionsResponse: any = await supabase.from('accounting_transactions').select('*').eq('organization_id', orgId).order('transaction_date', { ascending: false });
      setTransactions(transactionsResponse.data || []);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    const invoiceChannel = supabase.channel('invoices-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, loadData).subscribe();
    const paymentsChannel = supabase.channel('payments-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, loadData).subscribe();
    const interval = setInterval(loadData, 60000);
    
    return () => {
      supabase.removeChannel(invoiceChannel);
      supabase.removeChannel(paymentsChannel);
      clearInterval(interval);
    };
  }, []);

  // Confetti celebration for first payment
  useEffect(() => {
    if (payments.length === 1 && !localStorage.getItem('firstPaymentCelebrated')) {
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      });
      localStorage.setItem('firstPaymentCelebrated', 'true');
      toast({
        title: "🎉 Congratulations!",
        description: "You received your first payment!"
      });
    }
  }, [payments, toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    triggerHaptic('light');
    showSpinner();
    await loadData();
    hideSpinner();
    setRefreshing(false);
    sonnerToast.success("Data refreshed");
  };

  const formatCurrency = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100);

  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const groupPaymentsByDate = (paymentsList: any[]) => {
    const groups: { [key: string]: any[] } = { today: [], yesterday: [], thisWeek: [], earlier: [] };
    paymentsList.forEach(payment => {
      const paymentDate = new Date(payment.created_at);
      if (isToday(paymentDate)) groups.today.push(payment);
      else if (isYesterday(paymentDate)) groups.yesterday.push(payment);
      else if (isThisWeek(paymentDate)) groups.thisWeek.push(payment);
      else groups.earlier.push(payment);
    });
    return groups;
  };

  const filteredPayments = payments.filter(payment => {
    if (dateFilter === 'week') return isThisWeek(new Date(payment.created_at));
    if (dateFilter === 'lastWeek') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const paymentDate = new Date(payment.created_at);
      return paymentDate >= twoWeeksAgo && paymentDate < weekAgo;
    }
    return true;
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${label} copied to clipboard` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-link');
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      sonnerToast.error(error.message || 'Failed to connect Stripe');
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleMarkPaid = async (invoice: any) => {
    try {
      sonnerToast.loading("Marking invoice as paid...");
      
      const { error } = await supabase.functions.invoke('mark-invoice-paid', {
        body: { invoiceId: invoice.id }
      });

      if (error) throw error;

      sonnerToast.dismiss();
      sonnerToast.success("Invoice marked as paid!");
      loadData();
    } catch (error: any) {
      sonnerToast.dismiss();
      console.error('Error marking invoice as paid:', error);
      sonnerToast.error(error.message || 'Failed to mark invoice as paid');
    }
  };

  if (loading) return <div className="p-6 space-y-4 max-w-7xl mx-auto"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-64" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto pb-24">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Money</h1>
              <p className="text-xs text-muted-foreground mt-1">Synced {formatDistanceToNow(lastSyncTime, { addSuffix: true })}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-full">
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {stripeConnected === false && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Connect Stripe to Get Paid</h3>
                    <p className="text-sm text-muted-foreground">Set up your payment account to start accepting payments from clients</p>
                  </div>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    size="lg"
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    {connectingStripe ? "Connecting..." : "Connect Stripe Account"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <DropdownMenu><DropdownMenuTrigger asChild><Button size="lg" className="w-full md:w-auto"><Plus className="h-5 w-5 mr-2" />New Invoice / Payment</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuItem onClick={() => setShowInvoiceModal(true)}><Receipt className="h-4 w-4 mr-2" />Send Invoice</DropdownMenuItem><DropdownMenuItem onClick={() => setShowQuickPaymentModal(true)}><Link2 className="h-4 w-4 mr-2" />Create Payment Link</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>

        {enhancedMetrics && <WeeklySnapshot jobCount={enhancedMetrics.thisWeekJobs || 0} completedCount={enhancedMetrics.thisWeekCompleted || 0} earned={enhancedMetrics.thisWeekEarnings || 0} pending={enhancedMetrics.stripePending || 0} />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <EnhancedMetricCard icon={DollarSign} label="Total Earned" value={formatCurrency(enhancedMetrics?.totalEarned || 0)} subValue="Lifetime revenue" colorClass="text-green-600" />
          <EnhancedMetricCard icon={Wallet} label="Pending Payouts" value={formatCurrency(enhancedMetrics?.pendingPayouts || 0)} subValue="Available in Stripe" colorClass="text-blue-600" />
          <EnhancedMetricCard icon={Clock} label="Outstanding" value={formatCurrency(enhancedMetrics?.outstanding || 0)} subValue="Unpaid invoices" colorClass="text-orange-600" onClick={() => setActiveTab('owed')} />
          <EnhancedMetricCard icon={TrendingUp} label="This Week" value={formatCurrency(enhancedMetrics?.thisWeekEarnings || 0)} subValue={`${enhancedMetrics?.thisWeekJobs || 0} jobs`} colorClass="text-primary" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="owed"><span className="text-lg mr-1">💸</span><span className="hidden sm:inline">Money Owed</span><span className="sm:hidden">Owed</span></TabsTrigger>
            <TabsTrigger value="received"><span className="text-lg mr-1">✅</span><span className="hidden sm:inline">Money Received</span><span className="sm:hidden">Received</span></TabsTrigger>
            <TabsTrigger value="summary"><span className="text-lg mr-1">📊</span><span className="hidden sm:inline">Earnings Summary</span><span className="sm:hidden">Summary</span></TabsTrigger>
          </TabsList>

          <TabsContent value="owed" className="space-y-4">
            {invoices.filter(inv => inv.status !== 'paid').length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground">No unpaid invoices</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {invoices.filter(inv => inv.status !== 'paid').map((invoice: any) => (
                  <Card key={invoice.id} className="hover:bg-accent/5 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">Invoice #{invoice.invoice_number || invoice.id.slice(0,8)}</h3>
                            <Badge variant={invoice.status === 'overdue' ? 'destructive' : 'secondary'}>{invoice.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{invoice.client?.name || 'Unknown Client'}</p>
                          <p className="text-xs text-muted-foreground">Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                          <p className="text-xl font-bold">${((invoice.amount || 0) / 100).toFixed(2)}</p>
                          <div className="flex gap-2 w-full sm:w-auto">
                            {invoice.stripe_hosted_url && (
                              <Button size="sm" variant="outline" onClick={() => copyToClipboard(invoice.stripe_hosted_url, 'Payment link')} className="flex-1 sm:flex-none">
                                <Copy className="h-4 w-4 mr-1" />Copy Link
                              </Button>
                            )}
                            {!invoice.stripe_payment_intent_id && (
                              <Button size="sm" variant="default" onClick={async () => {
                                const {error} = await supabase.functions.invoke('mark-invoice-paid', {body: {invoiceId: invoice.id}});
                                if (error) {
                                  toast({title: "Error", description: error.message, variant: "destructive"});
                                } else {
                                  toast({title: "Payment Received", description: "Invoice marked as paid. Revenue updated."});
                                  loadData();
                                }
                              }}>
                                <DollarSign className="h-4 w-4 mr-1"/>Mark Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button size="sm" variant={dateFilter === 'week' ? 'default' : 'outline'} onClick={() => setDateFilter('week')}>This Week</Button>
              <Button size="sm" variant={dateFilter === 'lastWeek' ? 'default' : 'outline'} onClick={() => setDateFilter('lastWeek')}>Last Week</Button>
              <Button size="sm" variant={dateFilter === 'all' ? 'default' : 'outline'} onClick={() => setDateFilter('all')}>All Time</Button>
            </div>
            {filteredPayments.length === 0 ? <Card><CardContent className="pt-6 text-center text-muted-foreground">No payments received yet.</CardContent></Card> :
              Object.entries(groupPaymentsByDate(filteredPayments)).map(([group, groupPayments]: [string, any]) => groupPayments.length > 0 && <div key={group} className="space-y-2"><h3 className="text-sm font-medium text-muted-foreground capitalize">{group === 'thisWeek' ? 'This Week' : group}</h3>{groupPayments.map((payment: any) => <Card key={payment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPayment(payment)}><CardContent className="pt-6"><div className="flex items-start justify-between"><div className="space-y-1"><p className="font-medium">{payment.homeowner?.full_name || 'Unknown Client'}</p><p className="text-sm text-muted-foreground">{payment.booking?.service_name || 'Service'}</p><p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</p></div><div className="text-right space-y-1"><p className="text-2xl font-bold">{formatCurrency(payment.amount)}</p><Badge variant={payment.status === 'paid' || payment.status === 'completed' ? 'default' : 'secondary'}>{payment.status === 'paid' || payment.status === 'completed' ? '✅ Paid' : '⏳ Pending'}</Badge></div></div></CardContent></Card>)}</div>)
            }
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {enhancedMetrics && <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"><CardContent className="p-4"><p className="text-lg">🔥 <strong>This month</strong> you've earned approximately <strong>{formatCurrency(enhancedMetrics.thisWeekEarnings * 4)}</strong></p></CardContent></Card>}
            <Card><CardContent className="pt-6"><h3 className="text-lg font-semibold mb-4">Profit & Loss</h3><div className="space-y-4"><div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold text-green-600">{formatCurrency(enhancedMetrics?.totalEarned || 0)}</span></div><div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Total Expenses</span><span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span></div><div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Processing Fees</span><span className="font-semibold text-red-600">{formatCurrency(enhancedMetrics?.fees || 0)}</span></div><div className="flex justify-between items-center pt-2"><span className="font-bold text-lg">Net Profit</span><span className="text-2xl font-bold">{formatCurrency(enhancedMetrics?.net || 0)}</span></div></div></CardContent></Card>
            <Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />Export CSV</Button>
          </TabsContent>
        </Tabs>
      </div>

      {showInvoiceModal && <CreateInvoiceModal open={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} onSuccess={loadData} />}
      {showQuickPaymentModal && <QuickPaymentLinkModal open={showQuickPaymentModal} onClose={() => { setShowQuickPaymentModal(false); loadData(); }} />}
      {selectedPayment && (isMobile ? <Sheet open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}><SheetContent side="bottom" className="h-[90vh]"><PaymentDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} onRefresh={loadData} /></SheetContent></Sheet> : <PaymentDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} onRefresh={loadData} />)}
    </div>
  );
}
