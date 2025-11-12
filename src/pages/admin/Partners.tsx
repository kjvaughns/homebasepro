import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, Pause, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminPartners() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalCommissions: 0 });

  useEffect(() => {
    loadPartners();
    loadStats();
  }, [statusFilter]);

  const loadPartners = async () => {
    try {
      let query = supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast({
        title: "Error loading partners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: allPartners } = await supabase
        .from('partners')
        .select('id, status');

      const { data: commissions } = await supabase
        .from('partner_commissions')
        .select('amount');

      const total = allPartners?.length || 0;
      const active = allPartners?.filter(p => p.status === 'ACTIVE').length || 0;
      const pending = allPartners?.filter(p => p.status === 'PENDING').length || 0;
      const totalCommissions = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;

      setStats({ total, active, pending, totalCommissions });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const approvePartner = async (partnerId: string) => {
    try {
      const { error } = await supabase.functions.invoke('partner-approve', {
        body: { partnerId }
      });

      if (error) throw error;

      toast({ title: "Partner approved!" });
      loadPartners();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error approving partner",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (partnerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ status: newStatus })
        .eq('id', partnerId);

      if (error) throw error;

      toast({ title: `Partner status updated to ${newStatus}` });
      loadPartners();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredPartners = partners.filter(p =>
    p.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.referral_code?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ACTIVE: <Badge className="bg-green-500">Active</Badge>,
      PENDING: <Badge className="bg-yellow-500">Pending</Badge>,
      PAUSED: <Badge className="bg-gray-500">Paused</Badge>,
      BANNED: <Badge variant="destructive">Banned</Badge>,
    };
    return variants[status] || <Badge>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partners & Affiliates</h1>
        <p className="text-muted-foreground">Manage partner applications and accounts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCommissions.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.business_name || partner.contact_name}</TableCell>
                  <TableCell>{partner.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{partner.partner_type}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(partner.status)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{partner.referral_code}</code>
                  </TableCell>
                  <TableCell>{partner.commission_rate || 0}%</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {partner.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => approvePartner(partner.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {partner.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(partner.id, 'PAUSED')}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {partner.status === 'PAUSED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(partner.id, 'ACTIVE')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPartners.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No partners found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
