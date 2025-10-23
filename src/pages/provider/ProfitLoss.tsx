import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Download, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportPLtoCSV, exportQuickBooksJournal } from "@/utils/exportProfitLoss";

export default function ProfitLoss() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [plData, setPLData] = useState<any>(null);

  useEffect(() => {
    loadPL();
  }, [startDate, endDate]);

  const loadPL = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;
      setOrgId(org.id);

      const { data, error } = await (supabase.rpc as any)('calculate_profit_loss', {
        p_org_id: org.id,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      if (error) throw error;
      setPLData(data);
    } catch (error) {
      console.error('Error loading P&L:', error);
      toast.error('Failed to load profit & loss data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (plData) {
      exportPLtoCSV(plData, startDate, endDate);
      toast.success('Exported to CSV');
    }
  };

  const handleExportQB = () => {
    if (plData) {
      exportQuickBooksJournal(plData, startDate, endDate);
      toast.success('Exported for QuickBooks');
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss</h1>
          <p className="text-muted-foreground">Track your business profitability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportQB}>
            <Download className="h-4 w-4 mr-2" />
            QuickBooks
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {plData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${(plData.revenue / 100).toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost of Goods Sold</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts & Materials</span>
                <span className="font-medium">${(plData.parts_cost / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor Cost</span>
                <span className="font-medium">${(plData.labor_cost / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Total COGS</span>
                <span className="font-medium">${((plData.parts_cost + plData.labor_cost) / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gross Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${(plData.gross_profit / 100).toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Net Profit
                {plData.net_profit > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </CardTitle>
              <CardDescription>
                Margin: {plData.margin_pct.toFixed(2)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", plData.net_profit > 0 ? "text-green-600" : "text-red-600")}>
                ${(plData.net_profit / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}