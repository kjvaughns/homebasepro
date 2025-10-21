import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, CheckCircle, AlertCircle, Laptop } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PayrollRun {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount: number;
  processed_at: string | null;
  created_at: string;
}

export default function Payroll() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");

  useEffect(() => {
    loadPayrollData();
  }, []);

  const loadPayrollData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!org) return;
      setOrganizationId(org.id);

      const { data, error } = await (supabase as any)
        .from("payroll_runs")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayrollRuns(data || []);
    } catch (error) {
      console.error("Error loading payroll:", error);
      toast({
        title: "Error",
        description: "Failed to load payroll data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayrollRun = async () => {
    toast({
      title: "Feature Notice",
      description: "Payroll run creation is available on desktop",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Desktop Feature Notice */}
      <Alert className="bg-primary/5 border-primary/20 lg:hidden">
        <Laptop className="h-4 w-4" />
        <AlertDescription>
          Full payroll management features are available on desktop or tablet devices for better experience.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Manage team compensation and payroll runs</p>
        </div>
        <Button onClick={handleCreatePayrollRun}>
          <Plus className="mr-2 h-4 w-4" />
          New Payroll Run
        </Button>
      </div>

      {/* Recent Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Runs</CardTitle>
          <CardDescription>History of payroll processing</CardDescription>
        </CardHeader>
        <CardContent>
          {payrollRuns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">No payroll runs yet</p>
              <Button variant="outline" onClick={handleCreatePayrollRun}>
                Create First Payroll Run
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRuns.map((run) => (
                      <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <Badge
                              variant={
                                run.status === "completed"
                                  ? "default"
                                  : run.status === "processing"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="capitalize"
                            >
                              {run.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(run.period_start).toLocaleDateString()} -{" "}
                            {new Date(run.period_end).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(run.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {run.processed_at
                            ? new Date(run.processed_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {payrollRuns
                .filter(
                  (r) =>
                    r.status === "completed" &&
                    new Date(r.period_start).getMonth() === new Date().getMonth()
                )
                .reduce((sum, r) => sum + (r.total_amount || 0), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollRuns.filter((r) => r.status === "draft" || r.status === "processing").length}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden lg:block">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollRuns.filter((r) => r.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}