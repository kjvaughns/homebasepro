import { Button } from "@/components/ui/button";
import { Mail, Download, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BulkPaymentActionsProps {
  selectedIds: Set<string>;
  payments: any[];
  onClearSelection: () => void;
}

export function BulkPaymentActions({ 
  selectedIds, 
  payments, 
  onClearSelection 
}: BulkPaymentActionsProps) {
  const { toast } = useToast();

  const handleSendReminders = async () => {
    const eligiblePayments = payments.filter(p => 
      selectedIds.has(p.id) && (p.status === 'open' || p.status === 'pending')
    );

    if (eligiblePayments.length === 0) {
      toast({
        title: 'No eligible payments',
        description: 'Please select open or pending invoices to send reminders',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminders', {
        body: { payment_ids: Array.from(selectedIds) }
      });

      if (error) throw error;

      toast({
        title: 'Reminders Sent',
        description: data.message || `Sent ${data.count} payment reminder${data.count !== 1 ? 's' : ''}`,
      });
      onClearSelection();
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast({
        title: 'Failed to send reminders',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    const selectedPayments = payments.filter(p => selectedIds.has(p.id));
    const csv = [
      ['ID', 'Type', 'Status', 'Amount', 'Created', 'Description'].join(','),
      ...selectedPayments.map(p => [
        p.id,
        p.type || 'invoice',
        p.status,
        p.amount / 100,
        new Date(p.created_at).toLocaleDateString(),
        p.meta?.description || p.stripe_payment_intent_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Exported ${selectedPayments.length} payment${selectedPayments.length > 1 ? 's' : ''}`,
    });
  };

  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border">
      <span className="text-sm font-medium">
        {selectedIds.size} payment{selectedIds.size > 1 ? 's' : ''} selected
      </span>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSendReminders}
        >
          <Mail className="h-4 w-4 mr-2" />
          Send Reminders
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
