import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function UpcomingInvoiceCard() {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUpcomingInvoice();
  }, []);

  const loadUpcomingInvoice = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'get-upcoming-invoice' }
      });

      if (error) throw error;
      setInvoice(data.invoice);
    } catch (err: any) {
      console.error('Failed to load upcoming invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Invoice</CardTitle>
          <CardDescription>Your next billing charge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Invoice</CardTitle>
        <CardDescription>Preview your next billing charge</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Due on {format(new Date(invoice.period_end * 1000), 'MMM dd, yyyy')}</span>
        </div>

        <div className="space-y-2">
          {invoice.lines?.data?.map((line: any) => (
            <div key={line.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{line.description}</span>
              <span className="font-medium">${(line.amount / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Due</span>
          <span className="text-2xl font-bold">${(invoice.amount_due / 100).toFixed(2)}</span>
        </div>

        {invoice.discount && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
            <p className="text-sm text-green-800 dark:text-green-200">
              {invoice.discount.coupon.name} applied
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
