import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LedgerEntry {
  id: string;
  occurred_at: string;
  type: string;
  direction: string;
  amount_cents: number;
  currency: string;
  stripe_ref: string | null;
  party: string;
  job_id: string | null;
  provider_id: string | null;
  homeowner_id: string | null;
  metadata: any;
}

export default function Ledger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [partyFilter, setPartyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, [partyFilter, typeFilter, startDate, endDate]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(500);

      if (partyFilter !== 'all') {
        query = query.eq('party', partyFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (startDate) {
        query = query.gte('occurred_at', new Date(startDate).toISOString());
      }

      if (endDate) {
        query = query.lte('occurred_at', new Date(endDate).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Failed to load ledger entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ledger entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Direction', 'Amount', 'Party', 'Stripe Ref', 'Job ID', 'Provider ID'];
    const rows = filteredEntries.map((entry) => [
      format(new Date(entry.occurred_at), 'yyyy-MM-dd HH:mm:ss'),
      entry.type,
      entry.direction,
      (entry.amount_cents / 100).toFixed(2),
      entry.party,
      entry.stripe_ref || '',
      entry.job_id || '',
      entry.provider_id || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Ledger exported to CSV',
    });
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.stripe_ref?.toLowerCase().includes(query) ||
      entry.job_id?.toLowerCase().includes(query) ||
      entry.provider_id?.toLowerCase().includes(query) ||
      entry.type.toLowerCase().includes(query)
    );
  });

  const totalCredits = filteredEntries
    .filter((e) => e.direction === 'credit')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const totalDebits = filteredEntries
    .filter((e) => e.direction === 'debit')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const platformRevenue = filteredEntries
    .filter((e) => e.party === 'platform' && e.type === 'fee')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ledger</h1>
        <p className="text-muted-foreground">
          Complete transaction history and reconciliation
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${(totalCredits / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(totalDebits / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Platform Revenue (Fees)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${(platformRevenue / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter ledger entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Stripe ref, job ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Party</Label>
              <Select value={partyFilter} onValueChange={setPartyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="charge">Charge</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                  <SelectItem value="subscription_invoice">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadEntries} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Entries ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Stripe Ref</TableHead>
                    <TableHead>Job ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.occurred_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.direction === 'credit' ? 'default' : 'secondary'
                          }
                        >
                          {entry.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${(entry.amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge>{entry.party}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {entry.stripe_ref ? (
                          <span className="truncate max-w-[150px] block">
                            {entry.stripe_ref}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.job_id ? (
                          <span className="truncate max-w-[100px] block">
                            {entry.job_id.slice(0, 8)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
