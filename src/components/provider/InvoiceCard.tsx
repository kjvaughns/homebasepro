import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Send, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoiceCardProps {
  invoice: {
    id: string;
    invoice_number: string;
    amount: number;
    due_date: string;
    status: string;
    created_at: string;
    pdf_url?: string;
    clients?: {
      name: string;
      email: string;
    };
  };
  onRecordPayment?: (id: string) => void;
  onResend?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  paid: "bg-green-500/10 text-green-700 dark:text-green-400",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-400",
  cancelled: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export function InvoiceCard({ invoice, onRecordPayment, onResend }: InvoiceCardProps) {
  const dueDate = new Date(invoice.due_date);
  const isOverdue = invoice.status === "pending" && dueDate < new Date();

  const handleDownload = async () => {
    if (!invoice.pdf_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("client-files")
        .download(invoice.pdf_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{invoice.invoice_number}</h3>
              <p className="text-sm text-muted-foreground">
                {invoice.clients?.name || "Unknown Client"}
              </p>
            </div>
          </div>
          <Badge className={statusColors[isOverdue ? "overdue" : invoice.status]} variant="secondary">
            {isOverdue ? "Overdue" : invoice.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-semibold text-lg">${invoice.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-medium">{format(dueDate, "MMM d, yyyy")}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {invoice.pdf_url && (
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          {invoice.status === "pending" && onRecordPayment && (
            <Button size="sm" onClick={() => onRecordPayment(invoice.id)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          {invoice.status === "pending" && onResend && (
            <Button size="sm" variant="ghost" onClick={() => onResend(invoice.id)}>
              <Send className="h-4 w-4 mr-2" />
              Resend
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
