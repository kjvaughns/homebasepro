import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Download, DollarSign, Briefcase, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToQuickBooks, exportToGusto, downloadCSV } from "@/utils/earningsExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface JobEarning {
  id: string;
  team_member_id: string;
  team_members?: {
    full_name: string;
    email: string;
  };
  jobs?: {
    service_type: string;
    completed_at: string;
  };
  base_pay_cents: number;
  commission_cents: number;
  tip_cents: number;
  total_cents: number;
  hours_worked: number;
  status: string;
  pay_type: string;
}

export default function EarningsLedger() {
  const [earnings, setEarnings] = useState<JobEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "quickbooks" | "gusto">("csv");
  const [periodStart, setPeriodStart] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("team_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;

      const { data: org } = await (supabase as any)
        .from("organizations")
        .select("id, owner_user_id")
        .eq("id", member.organization_id)
        .single();

      if (!org || org.owner_user_id !== user.id) {
        toast({
          title: "Access Denied",
          description: "Only organization owners can access earnings management.",
          variant: "destructive",
        });
        return;
      }

      setOrganizationId(org.id);

      const { data: earningsData, error } = await (supabase as any)
        .from("job_earnings")
        .select(`
          *,
          team_members(full_name, email),
          jobs(service_type, completed_at)
        `)
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEarnings(earningsData || []);
    } catch (error) {
      console.error("Error loading earnings:", error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (earningId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const { error } = await (supabase as any)
        .from("job_earnings")
        .update({
          status: "approved",
          approved_by: member?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", earningId);

      if (error) throw error;

      toast({ title: "Success", description: "Earnings approved" });
      loadEarnings();
    } catch (error) {
      console.error("Error approving:", error);
      toast({
        title: "Error",
        description: "Failed to approve earnings",
        variant: "destructive",
      });
    }
  };

  const handleApproveAll = async (teamMemberId: string) => {
    try {
      const pendingForMember = earnings.filter(
        (e) => e.team_member_id === teamMemberId && e.status === "pending"
      );

      for (const earning of pendingForMember) {
        await handleApprove(earning.id);
      }

      toast({
        title: "Success",
        description: `Approved ${pendingForMember.length} earnings`,
      });
    } catch (error) {
      console.error("Error approving all:", error);
    }
  };

  const handleExport = () => {
    const approvedEarnings = earnings.filter(
      (e) => e.status === "approved" && 
      new Date(e.jobs?.completed_at || "") >= new Date(periodStart) &&
      new Date(e.jobs?.completed_at || "") <= new Date(periodEnd)
    );

    if (approvedEarnings.length === 0) {
      toast({
        title: "No Data",
        description: "No approved earnings in selected period",
        variant: "destructive",
      });
      return;
    }

    let csvContent = "";
    let filename = `earnings_${periodStart}_${periodEnd}.csv`;

    if (exportFormat === "csv") {
      csvContent = exportToCSV(approvedEarnings);
    } else if (exportFormat === "quickbooks") {
      csvContent = exportToQuickBooks(approvedEarnings);
      filename = `quickbooks_${periodStart}_${periodEnd}.csv`;
    } else if (exportFormat === "gusto") {
      csvContent = exportToGusto(approvedEarnings);
      filename = `gusto_${periodStart}_${periodEnd}.csv`;
    }

    downloadCSV(csvContent, filename);
    toast({ title: "Success", description: "Earnings exported successfully" });
  };

  const pendingEarnings = earnings.filter((e) => e.status === "pending");
  const approvedEarnings = earnings.filter((e) => e.status === "approved");
  const paidEarnings = earnings.filter((e) => e.status === "paid");

  const groupedPending = pendingEarnings.reduce((acc, earning) => {
    const memberId = earning.team_member_id;
    if (!acc[memberId]) {
      acc[memberId] = {
        member: earning.team_members,
        earnings: [],
        total: 0,
      };
    }
    acc[memberId].earnings.push(earning);
    acc[memberId].total += earning.total_cents;
    return acc;
  }, {} as Record<string, { member: any; earnings: JobEarning[]; total: number }>);

  if (loading) {
    return <div className="p-8 text-center">Loading earnings data...</div>;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Earnings Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Track, approve, and export team earnings
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingEarnings.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedEarnings.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({paidEarnings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {Object.values(groupedPending).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending earnings to approve
              </CardContent>
            </Card>
          ) : (
            Object.values(groupedPending).map(({ member, earnings: memberEarnings, total }) => (
              <Card key={member?.email}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {member?.full_name || "Unknown"}
                      </CardTitle>
                      <CardDescription>
                        {memberEarnings.length} jobs completed • ${(total / 100).toFixed(2)} pending
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {memberEarnings.map((earning) => (
                    <div key={earning.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{earning.jobs?.service_type || "Service"}</p>
                        <p className="text-sm text-muted-foreground">
                          {earning.jobs?.completed_at ? format(new Date(earning.jobs.completed_at), "MMM d, yyyy") : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(earning.total_cents / 100).toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs">
                          {earning.pay_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleApproveAll(memberEarnings[0].team_member_id)} className="flex-1">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve All (${(total / 100).toFixed(2)})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Pay Run</CardTitle>
              <CardDescription>
                Export approved earnings for payment processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Generic)</SelectItem>
                    <SelectItem value="quickbooks">QuickBooks</SelectItem>
                    <SelectItem value="gusto">Gusto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">Pay Run Summary</p>
                </div>
                <p className="text-2xl font-bold">
                  ${(approvedEarnings.reduce((sum, e) => sum + e.total_cents, 0) / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {approvedEarnings.length} jobs • {new Set(approvedEarnings.map(e => e.team_member_id)).size} team members
                </p>
              </div>

              <Button onClick={handleExport} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Pay Run
              </Button>
            </CardContent>
          </Card>

          {approvedEarnings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No approved earnings ready for export
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvedEarnings.map((earning) => (
                <Card key={earning.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{earning.team_members?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {earning.jobs?.service_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(earning.total_cents / 100).toFixed(2)}</p>
                        <Badge variant="secondary">Approved</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4 mt-4">
          {paidEarnings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No paid earnings recorded yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paidEarnings.map((earning) => (
                <Card key={earning.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{earning.team_members?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {earning.jobs?.service_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(earning.total_cents / 100).toFixed(2)}</p>
                        <Badge>Paid</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
