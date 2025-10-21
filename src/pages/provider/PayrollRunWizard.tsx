import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportToCSV, exportToQuickBooks, exportToGusto, downloadCSV } from "@/utils/payrollExport";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

export default function PayrollRunWizard() {
  const [exportFormat, setExportFormat] = useState<"csv" | "qbo" | "gusto">("csv");
  const { toast } = useToast();

  const handleExport = () => {
    toast({
      title: "Export Ready",
      description: "Payroll export functionality coming soon",
    });
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Create Payroll Run</h1>
      <Card>
        <CardHeader>
          <CardTitle>Export Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}