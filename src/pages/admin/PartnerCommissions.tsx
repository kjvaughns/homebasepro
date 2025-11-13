import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

export default function AdminPartnerCommissions() {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, voided: 0 });

  useEffect(() => {
    loadCommissions();
    loadStats();
  }, [statusFilter]);

  const loadCommissions = async () => {
    try {
      let query = supabase
        .from('partner_commissions')
        .select(`
          *,
          partners (business_name, referral_code)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter as Database['public']['Enums']['commission_status']);
      }

      const { data, error } = await query;
      if (error) throw error;

      setCommissions(data || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
      toast({
        title: "Error loading commissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: allCommissions } = await supabase
        .from('partner_commissions')
        .select('commission_amount_cents, status');

      const total = allCommissions?.reduce((sum, c) => sum + c.commission_amount_cents / 100, 0) || 0;
      const pending = allCommissions?.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commission_amount_cents / 100, 0) || 0;
      const paid = allCommissions?.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.commission_amount_cents / 100, 0) || 0;
      const voided = allCommissions?.filter(c => c.status === 'VOID').reduce((sum, c) => sum + c.commission_amount_cents / 100, 0) || 0;

      setStats({ total, pending, paid, voided });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: <Badge className="bg-yellow-500">Pending</Badge>,
      PAID: <Badge className="bg-green-500">Paid</Badge>,
      VOIDED: <Badge variant="destructive">Voided</Badge>,
    };
    return variants[status] || <Badge>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partner Commissions</h1>
        <p className="text-muted-foreground">Track and manage all partner commission payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">${stats.pending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.paid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Voided</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${stats.voided.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="VOIDED">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Base Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    {new Date(commission.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {commission.partners?.business_name || 'Unknown'}
                    <br />
                    <code className="text-xs text-muted-foreground">
                      {commission.partners?.referral_code}
                    </code>
                  </TableCell>
                  <TableCell>${((commission.base_amount_cents || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell>{((commission.commission_rate_bp || 0) / 100).toFixed(1)}%</TableCell>
                  <TableCell className="font-semibold">
                    ${((commission.commission_amount_cents || 0) / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(commission.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {commissions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No commissions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
