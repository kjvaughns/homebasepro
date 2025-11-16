import { useEffect, useState, useCallback } from "react";
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
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user.id).single();
      if (!org) return;

      const { data: metricsData } = await supabase.functions.invoke('get-enhanced-metrics');
      setEnhancedMetrics(metricsData);

      const { data: invoicesData } = await supabase.from('invoices').select('*, client:clients(name, email)').eq('org_id', org.id).order('created_at', { ascending: false });
      setInvoices(invoicesData || []);

      const { data: paymentsData } = await supabase.from('payments').select('*, homeowner:profiles!payments_homeowner_profile_id_fkey(full_name), booking:bookings(service_name)').eq('org_id', org.id).order('created_at', { ascending: false });
      setPayments(paymentsData || []);

      const { data: transactionsData } = await supabase.from('accounting_transactions').select('*').eq('organization_id', org.id).order('transaction_date', { ascending: false });
      setTransactions(transactionsData || []);
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [loadData]);

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

  if (loading) return <div className="p-6 space-y-4 max-w-7xl mx-auto"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-64" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto pb-24">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div><h1 className="text-3xl font-bold">Money</h1><p className="text-xs text-muted-foreground mt-1">Synced {formatDistanceToNow(lastSyncTime, { addSuffix: true })}</p></div>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-full"><RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} /></Button>
          </div>
          
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
            {invoices.length === 0 ? <Card><CardContent className="pt-6 text-center text-muted-foreground">No invoices yet. Create your first invoice to get started!</CardContent></Card> : 
              invoices.map(inv => <Card key={inv.id} className="hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-start justify-between mb-4"><div className="space-y-1"><p className="font-medium">{inv.client?.name || 'Unknown Client'}</p><p className="text-sm text-muted-foreground">Invoice #{inv.id.slice(0, 8)}</p><p className="text-sm text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p></div><div className="text-right space-y-1"><p className="text-2xl font-bold">{formatCurrency(inv.amount)}</p><Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'pending' ? 'secondary' : 'destructive'}>{inv.status}</Badge></div></div>{inv.stripe_payment_link && <div className="flex gap-2 flex-wrap"><Button size="sm" variant="outline" onClick={() => copyToClipboard(inv.stripe_payment_link, 'Payment link')}><Copy className="h-3 w-3 mr-1" />Copy Link</Button>{inv.status !== 'paid' && <Button size="sm" variant="outline" onClick={() => toast({ title: "Reminder sent", description: "Payment reminder sent to client" })}><Send className="h-3 w-3 mr-1" />Send Reminder</Button>}</div>}</CardContent></Card>)
            }
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
      {selectedPayment && (isMobile ? <Sheet open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}><SheetContent side="bottom" className="h-[90vh]"><PaymentDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} /></SheetContent></Sheet> : <PaymentDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} />)}
    </div>
  );
}
