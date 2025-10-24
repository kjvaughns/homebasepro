import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Receipt, DollarSign, ArrowUpRight, Sparkles, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentDrawer } from "@/components/provider/PaymentDrawer";
import { CreateInvoiceModal } from "@/components/provider/CreateInvoiceModal";
import { DisputeDrawer } from "@/components/provider/DisputeDrawer";
import { BulkPaymentActions } from "@/components/provider/BulkPaymentActions";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  url?: string;
  stripe_id?: string;
  meta?: any;
  client_id?: string;
  job_id?: string;
}

interface Invoice {
  id: string;
  invoice_number?: string;
  client_name?: string;
  client_email?: string;
  amount: number;
  status: string;
  created_at: string;
  due_date?: string;
  stripe_hosted_url?: string;
  org_id?: string;
  [key: string]: any;
}

export default function PaymentsPage() {
  const { isMobile } = useMobileLayout();
  const [metrics, setMetrics] = useState<any>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(500);

      setPayments(paymentsData || []);

      // Load invoices - using type assertion to avoid deep type instantiation
      const invoicesQuery = await (supabase as any)
        .from('invoices')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(500);

      setInvoices(invoicesQuery?.data || []);

      // Load payouts
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      setPayouts(payoutsData || []);

      // Load disputes
      const { data: disputesData } = await supabase
        .from('disputes')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      setDisputes(disputesData || []);

    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    const s = searchQuery.toLowerCase();
    return payments.filter(p =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (
        p.type?.toLowerCase().includes(s) ||
        p.status?.toLowerCase().includes(s) ||
        p.meta?.client_name?.toLowerCase().includes(s) ||
        p.meta?.description?.toLowerCase().includes(s)
      )
    );
  }, [payments, searchQuery, statusFilter]);

  const selectablePayments = useMemo(() => {
    return filteredPayments.filter(p => 
      p.status === 'open' || p.status === 'pending'
    );
  }, [filteredPayments]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === selectablePayments.length && selectablePayments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectablePayments.map(p => p.id)));
    }
  };

  const loadAiSuggestions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('payments-ai', {
        body: { action: 'suggest_actions' }
      });

      if (error) throw error;
      setAiSuggestions(data.suggestions || []);
      
      toast({
        title: "AI Suggestions Ready",
        description: `Found ${data.suggestions?.length || 0} actionable insights`,
      });
    } catch (error) {
      console.error('AI suggestions error:', error);
      toast({
        title: "Error",
        description: "Failed to load AI suggestions",
        variant: "destructive",
      });
    }
  };

  const syncPayments = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-payments', {
        body: { daysBack: 90 }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data.totalSynced || 0} payments from Stripe`,
      });

      await loadData();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync payments",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const exportCsv = () => {
    const header = ['Date', 'Type', 'Status', 'Client', 'Amount', 'Fee', 'Net'];
    const rows = filteredPayments.map(p => [
      new Date(p.created_at).toLocaleDateString(),
      p.type,
      p.status,
      p.meta?.client_name || '—',
      currency(p.amount / 100),
      '—',
      currency(p.amount / 100),
    ]);

    const csv = [header, ...rows].map(row => row.join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Card>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6 overflow-x-hidden">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Track your revenue and transactions</p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPI label="Total Revenue" value={currency((metrics.total || 0) / 100)} icon={<DollarSign className="h-4 w-4" />} />
        <KPI label="Platform Fees" value={currency((metrics.fees || 0) / 100)} icon={<Receipt className="h-4 w-4" />} />
        <KPI label="Net Revenue" value={currency((metrics.net || 0) / 100)} icon={<ArrowUpRight className="h-4 w-4" />} />
        <KPI label="Unpaid (AR)" value={currency((metrics.ar || 0) / 100)} icon={<TrendingUp className="h-4 w-4" />} />
      </section>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">AI Suggestions</h3>
          <div className="grid gap-2">
            {aiSuggestions.map((s, i) => (
              <Card key={i} className="bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <Button size="sm" variant="outline">{s.action}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={syncPayments} disabled={syncing} className="flex-1 sm:flex-initial">
            <RefreshCw className={`h-4 w-4 sm:mr-1 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Payments'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadAiSuggestions} className="flex-1 sm:flex-initial">
            <Sparkles className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">AI Insights</span>
          </Button>
          <Button size="sm" onClick={() => setShowInvoice(true)} className="flex-1 sm:flex-initial">
            <Receipt className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Send Invoice</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="flex-1 sm:flex-initial">
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({disputes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          {selectedIds.size > 0 && (
            <div className="mb-4">
              <BulkPaymentActions
                selectedIds={selectedIds}
                payments={filteredPayments}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            </div>
          )}
          
          <Card>
            <div className="p-3 flex gap-2 items-center border-b">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transactions found</div>
            ) : isMobile ? (
              // Mobile Card View
              <div className="p-3 space-y-3">
                {filteredPayments.map((p) => (
                  <Card
                    key={p.id}
                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedPayment(p)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <StatusBadge s={p.status} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">
                        {currency(p.amount / 100)}
                      </p>
                    </div>
                    <p className="text-sm font-medium capitalize">{p.type?.replace('_', ' ')}</p>
                    {p.meta?.client_name && (
                      <p className="text-sm text-muted-foreground">{p.meta.client_name}</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2 font-medium">
                        <Checkbox
                          checked={selectedIds.size === selectablePayments.length && selectablePayments.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all payments"
                        />
                      </th>
                      <TH>Date</TH>
                      <TH>Type</TH>
                      <TH>Status</TH>
                      <TH>Client</TH>
                      <TH className="text-right pr-3">Amount</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const isSelectable = p.status === 'open' || p.status === 'pending';
                      return (
                        <tr
                          key={p.id}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-2">
                            <Checkbox
                              checked={selectedIds.has(p.id)}
                              onCheckedChange={() => toggleSelection(p.id)}
                              disabled={!isSelectable}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select payment ${p.id}`}
                            />
                          </td>
                          <TD onClick={() => setSelectedPayment(p)} className="cursor-pointer">{new Date(p.created_at).toLocaleDateString()}</TD>
                          <TD onClick={() => setSelectedPayment(p)} className="cursor-pointer"><span className="capitalize">{p.type?.replace('_', ' ')}</span></TD>
                          <TD onClick={() => setSelectedPayment(p)} className="cursor-pointer"><StatusBadge s={p.status} /></TD>
                          <TD onClick={() => setSelectedPayment(p)} className="cursor-pointer">{p.meta?.client_name || '—'}</TD>
                          <TD onClick={() => setSelectedPayment(p)} className="cursor-pointer text-right pr-3 font-medium">{currency(p.amount / 100)}</TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No invoices yet</p>
                <p className="text-sm mt-1">Send your first invoice to get started</p>
                <Button size="sm" className="mt-4" onClick={() => setShowInvoice(true)}>
                  <Receipt className="h-4 w-4 mr-1" />
                  Create Invoice
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <TH>Invoice #</TH>
                      <TH>Client</TH>
                      <TH>Date</TH>
                      <TH>Due Date</TH>
                      <TH>Amount</TH>
                      <TH>Status</TH>
                      <TH></TH>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/30">
                        <TD className="font-mono text-xs">{inv.invoice_number || inv.id.slice(0, 8)}</TD>
                        <TD>
                          <div>
                            <p className="font-medium">{inv.client_name}</p>
                            <p className="text-xs text-muted-foreground">{inv.client_email}</p>
                          </div>
                        </TD>
                        <TD>{new Date(inv.created_at).toLocaleDateString()}</TD>
                        <TD>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</TD>
                        <TD className="font-medium">{currency(inv.amount / 100)}</TD>
                        <TD><StatusBadge s={inv.status} /></TD>
                        <TD>
                          {inv.stripe_hosted_url && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.open(inv.stripe_hosted_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No payouts yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <TH>Date</TH>
                      <TH>Amount</TH>
                      <TH>Arrival Date</TH>
                      <TH>Status</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-b">
                        <TD>{new Date(p.created_at).toLocaleDateString()}</TD>
                        <TD className="font-medium">{currency(p.amount)}</TD>
                        <TD>{p.arrival_date ? new Date(p.arrival_date).toLocaleDateString() : '—'}</TD>
                        <TD><StatusBadge s={p.status} /></TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            {disputes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No disputes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <TH>Date</TH>
                      <TH>Amount</TH>
                      <TH>Reason</TH>
                      <TH>Status</TH>
                      <TH>Due By</TH>
                      <TH></TH>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.map((d) => (
                      <tr key={d.id} className="border-b hover:bg-muted/30">
                        <TD>{new Date(d.created_at).toLocaleDateString()}</TD>
                        <TD className="font-medium">{currency(d.amount)}</TD>
                        <TD><span className="capitalize">{d.reason?.replace('_', ' ')}</span></TD>
                        <TD><StatusBadge s={d.status} /></TD>
                        <TD>{d.due_by ? new Date(d.due_by).toLocaleDateString() : '—'}</TD>
                        <TD>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedDispute(d)}>
                            View
                          </Button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {selectedPayment && (
        <PaymentDrawer
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRefresh={loadData}
        />
      )}

      {selectedDispute && (
        <DisputeDrawer
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onRefresh={loadData}
        />
      )}

      <CreateInvoiceModal
        open={showInvoice}
        onClose={() => {
          setShowInvoice(false);
          loadData();
        }}
      />
    </div>
  );
}

function KPI({ label, value, icon }: any) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="text-xl md:text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: any = {
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    open: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    refunded: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    disputed: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s] || "bg-muted text-foreground/70"}`}>
      {s || "—"}
    </span>
  );
}

const TH = (p: any) => <th className="px-3 py-2 text-left font-medium">{p.children}</th>;
const TD = (p: any) => <td className="px-3 py-3">{p.children}</td>;
const currency = (n: number = 0) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;