import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, Receipt, TrendingUp, Plus, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateInvoiceModal } from "@/components/provider/CreateInvoiceModal";
import { PaymentDrawer } from "@/components/provider/PaymentDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDespia } from "@/hooks/useDespia";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast as sonnerToast } from "sonner";

export default function Money() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { triggerHaptic, showSpinner, hideSpinner } = useDespia();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'invoices');
  const [invoiceFilter, setInvoiceFilter] = useState(searchParams.get('filter') || 'all');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    setupPullToRefresh();
  }, []);

  useEffect(() => {
    // Handle deep links
    const action = searchParams.get('action');
    if (action === 'invoice') {
      setShowInvoiceModal(true);
      // Clear action param after opening modal
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams);
    } else if (action === 'payment') {
      setActiveTab('payments');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams);
    }
  }, [searchParams]);

  const setupPullToRefresh = () => {
    let startY = 0;
    let currentY = 0;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      
      if (distance > 100) {
        handleRefresh();
        pulling = false;
      }
    };

    const handleTouchEnd = () => {
      pulling = false;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  };

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) return;

      // Load KPIs
      const { data: kpis } = await supabase.rpc('payments_kpis', { org_uuid: org.id });
      setMetrics(kpis || {});

      // Load invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(100);

      setInvoices(invoicesData || []);

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(100);

      setPayments(paymentsData || []);

      // Load transactions (for accounting)
      const { data: transactionsData } = await supabase
        .from('transactions' as any)
        .select('*')
        .eq('organization_id', org.id)
        .order('transaction_date', { ascending: false })
        .limit(100);

      setTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleRefresh = async () => {
    triggerHaptic('light');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    triggerHaptic('success');
    sonnerToast.success("Financial data refreshed");
  };

  const currency = (val: number) => `$${val.toFixed(2)}`;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 pb-safe">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Money</h1>
          <p className="text-sm text-muted-foreground">Your finances</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} ${!isMobile ? 'mr-2' : ''}`} />
            {!isMobile && 'Refresh'}
          </Button>
          <Button onClick={() => {
            triggerHaptic('light');
            setShowInvoiceModal(true);
          }}>
            {isMobile ? <Receipt className="h-4 w-4" /> : <><Receipt className="h-4 w-4 mr-2" />Send Invoice</>}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm mb-1">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
              <span>Total Revenue</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{currency((metrics.total || 0) / 100)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm mb-1">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span>Unpaid (AR)</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{currency((metrics.ar || 0) / 100)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl col-span-2 md:col-span-1">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm mb-1">
              <Receipt className="h-3 w-3 md:h-4 md:w-4" />
              <span>Net Profit</span>
            </div>
            <p className="text-xl md:text-2xl font-bold">{currency(netProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        triggerHaptic('light');
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices" className="text-xs md:text-sm">Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs md:text-sm">Payments</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs md:text-sm">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4 md:mt-6 space-y-3">
          <div className="flex justify-between items-center mb-3">
            {invoiceFilter === 'unpaid' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setInvoiceFilter('all');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('filter');
                  setSearchParams(newParams);
                }}
              >
                Clear Filter
              </Button>
            )}
          </div>
          
          {(invoiceFilter === 'unpaid' 
            ? invoices.filter(inv => ['pending', 'overdue'].includes(inv.status || ''))
            : invoices
          ).length > 0 ? (
            (invoiceFilter === 'unpaid' 
              ? invoices.filter(inv => ['pending', 'overdue'].includes(inv.status || ''))
              : invoices
            ).map((invoice) => (
              <Card 
                key={invoice.id} 
                className="p-3 md:p-4 hover:bg-accent/50 cursor-pointer transition-all rounded-2xl active:scale-[0.98]"
                onClick={() => triggerHaptic('light')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm md:text-base">{invoice.client_name || 'Unnamed Client'}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Invoice #{invoice.invoice_number} • {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base md:text-lg font-semibold">{currency(invoice.amount / 100)}</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <p className="text-muted-foreground">
                {invoiceFilter === 'unpaid' ? 'No unpaid invoices' : 'No invoices yet'}
              </p>
              <Button onClick={() => {
                triggerHaptic('light');
                setShowInvoiceModal(true);
              }} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invoice
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 md:mt-6 space-y-3">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <Card 
                key={payment.id} 
                className="p-3 md:p-4 hover:bg-accent/50 cursor-pointer transition-all rounded-2xl active:scale-[0.98]"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedPayment(payment);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm md:text-base capitalize">{payment.type?.replace('_', ' ')}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base md:text-lg font-semibold">{currency(payment.amount / 100)}</p>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 md:p-12 text-center rounded-2xl">
              <p className="text-muted-foreground">No payments yet</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4 md:mt-6">
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-4">Profit & Loss Statement</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-sm md:text-base">Total Revenue</span>
                  <span className="text-base md:text-lg font-semibold text-emerald-600">{currency(totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium text-sm md:text-base">Total Expenses</span>
                  <span className="text-base md:text-lg font-semibold text-red-600">{currency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-base md:text-lg">Net Profit</span>
                  <span className="text-xl md:text-2xl font-bold">{currency(netProfit)}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-6" 
                onClick={() => triggerHaptic('light')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showInvoiceModal && (
        <CreateInvoiceModal
          open={showInvoiceModal}
          onClose={() => {
            triggerHaptic('light');
            setShowInvoiceModal(false);
            loadData();
          }}
        />
      )}

      {selectedPayment && (
        isMobile ? (
          <Sheet open={!!selectedPayment} onOpenChange={() => {
            triggerHaptic('light');
            setSelectedPayment(null);
          }}>
            <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-3xl">
              <div className="h-full overflow-y-auto">
                <PaymentDrawer
                  payment={selectedPayment}
                  onClose={() => {
                    triggerHaptic('light');
                    setSelectedPayment(null);
                  }}
                  onRefresh={loadData}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <PaymentDrawer
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
            onRefresh={loadData}
          />
        )
      )}
    </div>
  );
}
