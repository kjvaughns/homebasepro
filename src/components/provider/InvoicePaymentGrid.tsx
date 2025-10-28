import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign, Calendar, ExternalLink } from "lucide-react";

interface InvoicePaymentGridProps {
  invoices: any[];
  payments: any[];
  onRecordPayment?: (invoiceId: string) => void;
}

export default function InvoicePaymentGrid({ 
  invoices, 
  payments, 
  onRecordPayment 
}: InvoicePaymentGridProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoices Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Invoices ({invoices.length})
        </h3>
        {invoices.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No invoices yet
          </Card>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}</span>
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        <span>${((invoice.amount || 0) / 100).toFixed(2)}</span>
                      </div>
                      {invoice.due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {invoice.job_id && (
                        <div className="text-xs">
                          Job: {invoice.job_id.slice(0, 8)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {invoice.stripe_hosted_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(invoice.stripe_hosted_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {invoice.status !== 'paid' && onRecordPayment && (
                      <Button
                        size="sm"
                        onClick={() => onRecordPayment(invoice.id)}
                      >
                        Record Payment
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payments ({payments.length})
        </h3>
        {payments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No payments yet
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <Card key={payment.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">${((payment.amount || 0) / 100).toFixed(2)}</span>
                      <Badge variant={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>{new Date(payment.created_at).toLocaleDateString()}</div>
                      {payment.meta?.description && (
                        <div className="text-xs mt-1">{payment.meta.description}</div>
                      )}
                      {payment.job_id && (
                        <div className="text-xs">
                          Job: {payment.job_id.slice(0, 8)}
                        </div>
                      )}
                    </div>
                  </div>
                  {payment.url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(payment.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
