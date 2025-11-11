import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

export default function PartnersPayouts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/partners/login");
        return;
      }

      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!partner) return;

      const { data, error } = await supabase
        .from("partner_payouts")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (error) {
      console.error("Error loading payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PAID: "default",
      PENDING: "secondary",
      FAILED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/partners/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Payout History</h1>
              <p className="text-sm text-muted-foreground">
                View your commission payouts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading payouts...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No payouts yet</p>
              <p className="text-sm text-muted-foreground">
                You'll see your payout history here once commissions are processed
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {format(new Date(payout.period_start), "MMM d")} - {format(new Date(payout.period_end), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        ${(payout.total_amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payout.status)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {payout.stripe_transfer_id || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payout.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
