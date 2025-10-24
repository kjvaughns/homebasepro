import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Download, Loader2 } from "lucide-react";

const REPORT_TYPES = [
  { value: "balance.summary.1", label: "Balance Summary" },
  { value: "payouts.summary.1", label: "Payouts Summary" },
  { value: "balance_change_from_activity.summary.1", label: "Activity Summary" },
];

export function StripeReportGenerator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("balance.summary.1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<any>(null);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDownloadUrl(null);
    setReportDetails(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('generate-stripe-report', {
        body: {
          reportType,
          startDate,
          endDate,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.status === 'pending') {
        toast({
          title: "Report generating",
          description: data.message,
        });
      } else {
        setDownloadUrl(data.downloadUrl);
        setReportDetails(data);
        toast({
          title: "Report ready",
          description: "Your Stripe report has been generated successfully",
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Stripe Financial Reports
        </CardTitle>
        <CardDescription>
          Generate detailed financial reports from Stripe for reconciliation and accounting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <Button 
          onClick={generateReport} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>

        {downloadUrl && reportDetails && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Report Ready</p>
                <p className="text-xs text-muted-foreground">
                  {reportDetails.filename} ({(reportDetails.size / 1024).toFixed(0)} KB)
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(reportDetails.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <Button asChild size="sm">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
