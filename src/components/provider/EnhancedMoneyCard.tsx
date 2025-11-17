import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface Balance {
  available: number;
  pending: number;
  currency: string;
}

export function EnhancedMoneyCard() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [paidThisWeek, setPaidThisWeek] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setSyncing(true);
    try {
      // Load Stripe balance
      const { data: balanceData, error: balanceError } = await supabase.functions.invoke('payments-api', {
        body: { action: 'provider-balance' },
      });

      if (!balanceError) {
        setBalance(balanceData);
      }

      // Load paid invoices this week
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (org) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('org_id', org.id)
            .eq('status', 'succeeded')
            .gte('created_at', weekAgo.toISOString());

          const total = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          setPaidThisWeek(total);
        }
      }

      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const formatCurrency = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`;

  const getTimeSince = () => {
    const seconds = Math.floor((new Date().getTime() - lastSync.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">💰 This Week's Money</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  const hasStripe = balance !== null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">💰 This Week's Money</CardTitle>
          <div className="flex items-center gap-2">
            {syncing && (
              <div className="animate-pulse h-2 w-2 bg-primary rounded-full" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={syncing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Synced {getTimeSince()}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasStripe ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">Connect Stripe to see your balance</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/provider/settings?tab=payments')}
            >
              Connect Stripe
            </Button>
          </div>
        ) : (
          <>
            {/* Pending Balance */}
            <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">💰 Pending</p>
                <p className="text-2xl font-bold">{formatCurrency(balance.pending)}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
            </div>

            {/* Available Balance */}
            <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">🏦 Available</p>
                <p className="text-2xl font-bold">{formatCurrency(balance.available)}</p>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground mt-1" />
            </div>

            {/* Paid This Week */}
            <div className="flex items-start justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground mb-1">📊 Paid This Week</p>
                <p className="text-2xl font-bold text-primary">${paidThisWeek.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/provider/money?action=invoice')}
          >
            Send Invoice
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/provider/money?tab=payments')}
          >
            Record Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
