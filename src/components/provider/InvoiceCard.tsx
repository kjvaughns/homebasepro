import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, Send, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface InvoiceCardProps {
  invoice: {
    id: string;
    amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    due_date: string;
    sent_at?: string;
    paid_at?: string;
    clients?: {
      name: string;
      email: string;
    };
  };
  onSendReminder?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusConfig = {
  draft: { color: "bg-gray-500/10 text-gray-700 dark:text-gray-400", icon: Calendar },
  sent: { color: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Send },
  paid: { color: "bg-green-500/10 text-green-700 dark:text-green-400", icon: CheckCircle },
  overdue: { color: "bg-red-500/10 text-red-700 dark:text-red-400", icon: AlertCircle },
  cancelled: { color: "bg-gray-500/10 text-gray-700 dark:text-gray-400", icon: XCircle },
};

export const InvoiceCard = ({ invoice, onSendReminder, onMarkPaid, onCancel }: InvoiceCardProps) => {
  const StatusIcon = statusConfig[invoice.status].icon;
  const dueDate = new Date(invoice.due_date);
  const isOverdue = invoice.status === 'sent' && dueDate < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              ${invoice.amount}
            </CardTitle>
            {invoice.clients && (
              <p className="text-sm text-muted-foreground">{invoice.clients.name}</p>
            )}
          </div>
          <Badge className={statusConfig[isOverdue ? 'overdue' : invoice.status].color} variant="secondary">
            <StatusIcon className="w-3 h-3 mr-1" />
            {isOverdue ? 'Overdue' : invoice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date:</span>
            <span className="font-medium">{format(dueDate, 'MMM d, yyyy')}</span>
          </div>
          {invoice.sent_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sent:</span>
              <span>{format(new Date(invoice.sent_at), 'MMM d, yyyy')}</span>
            </div>
          )}
          {invoice.paid_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid:</span>
              <span>{format(new Date(invoice.paid_at), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {invoice.status === 'sent' || isOverdue ? (
          <div className="flex gap-2 pt-2">
            {onSendReminder && (
              <Button size="sm" variant="outline" onClick={() => onSendReminder(invoice.id)}>
                <Send className="h-4 w-4 mr-1" />
                Send Reminder
              </Button>
            )}
            {onMarkPaid && (
              <Button size="sm" onClick={() => onMarkPaid(invoice.id)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Paid
              </Button>
            )}
          </div>
        ) : null}

        {invoice.status === 'draft' && onCancel && (
          <Button size="sm" variant="ghost" onClick={() => onCancel(invoice.id)}>
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
