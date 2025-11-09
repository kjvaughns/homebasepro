import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, Receipt, TrendingUp, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateInvoiceModal } from "@/components/provider/CreateInvoiceModal";
import { PaymentDrawer } from "@/components/provider/PaymentDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Money() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({});
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
        .from('invoices' as any)
        .select('*')
        .eq('org_id', org.id)
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
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
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Money</h1>
          <p className="text-muted-foreground">Track your finances in one place</p>
        </div>
        <Button onClick={() => setShowInvoiceModal(true)}>
          <Receipt className="h-4 w-4 mr-2" />
          Send Invoice
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">{currency((metrics.total || 0) / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>Unpaid (AR)</span>
            </div>
            <p className="text-2xl font-bold">{currency((metrics.ar || 0) / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Receipt className="h-4 w-4" />
              <span>Net Profit</span>
            </div>
            <p className="text-2xl font-bold">{currency(netProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6 space-y-3">
          {invoices.length > 0 ? (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="p-4 hover:bg-muted/30 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{invoice.client_name || 'Unnamed Client'}</p>
                    <p className="text-sm text-muted-foreground">
                      Invoice #{invoice.invoice_number} • {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{currency(invoice.amount / 100)}</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No invoices yet</p>
              <Button onClick={() => setShowInvoiceModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invoice
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-6 space-y-3">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <Card 
                key={payment.id} 
                className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedPayment(payment)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{payment.type?.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{currency(payment.amount / 100)}</p>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No payments yet</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Profit & Loss Statement</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-lg font-semibold text-emerald-600">{currency(totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-lg font-semibold text-red-600">{currency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-lg">Net Profit</span>
                  <span className="text-2xl font-bold">{currency(netProfit)}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6">
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
            setShowInvoiceModal(false);
            loadData();
          }}
        />
      )}

      {selectedPayment && (
        <PaymentDrawer
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
