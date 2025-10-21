import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Link2, Receipt, DollarSign, ArrowUpRight, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentDrawer } from "@/components/provider/PaymentDrawer";
import { CreatePaymentLinkModal } from "@/components/provider/CreatePaymentLinkModal";
import { CreateInvoiceModal } from "@/components/provider/CreateInvoiceModal";
import { DisputeDrawer } from "@/components/provider/DisputeDrawer";
import { useMobileLayout } from "@/hooks/useMobileLayout";

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

export default function PaymentsPage() {
  const { isMobile } = useMobileLayout();
  const [metrics, setMetrics] = useState<any>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
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

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={loadAiSuggestions}>
            <Sparkles className="h-4 w-4 mr-1" />
            AI Insights
          </Button>
          <Button onClick={() => setShowPaymentLink(true)}>
            <Link2 className="h-4 w-4 mr-1" />
            Payment Link
          </Button>
          <Button onClick={() => setShowInvoice(true)}>
            <Receipt className="h-4 w-4 mr-1" />
            Invoice
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />
            Export
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
                      <TH>Date</TH>
                      <TH>Type</TH>
                      <TH>Status</TH>
                      <TH>Client</TH>
                      <TH className="text-right pr-3">Amount</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPayment(p)}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                      >
                        <TD>{new Date(p.created_at).toLocaleDateString()}</TD>
                        <TD><span className="capitalize">{p.type?.replace('_', ' ')}</span></TD>
                        <TD><StatusBadge s={p.status} /></TD>
                        <TD>{p.meta?.client_name || '—'}</TD>
                        <TD className="text-right pr-3 font-medium">{currency(p.amount / 100)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              Invoices view - filtered transactions with type='invoice'
            </p>
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

      <CreatePaymentLinkModal
        open={showPaymentLink}
        onClose={() => {
          setShowPaymentLink(false);
          loadData();
        }}
      />

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