import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateInvoicePDF } from "@/utils/generateInvoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Send } from "lucide-react";

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  jobId?: string;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export function CreateInvoiceModal({ open, onClose, clientId, jobId }: CreateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(clientId || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name, email")
      .eq("organization_id", org.id)
      .order("name");

    setClients(data || []);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const handleCreate = async (sendEmail: boolean) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, email, stripe_account_id, stripe_onboarding_complete")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      // Check if Stripe Connect is set up (required for email sending)
      if (sendEmail && (!org.stripe_account_id || !org.stripe_onboarding_complete)) {
        toast.error("Please complete Stripe Connect setup in Settings > Payments before sending invoices");
        setLoading(false);
        return;
      }

      const { data: client } = await supabase
        .from("clients")
        .select("email, name")
        .eq("id", selectedClient)
        .single();

      if (!client) {
        toast.error("Client not found");
        return;
      }

      const total = calculateTotal();
      const invoiceNumber = `INV-${Date.now()}`;

      // Generate PDF
      const pdfBlob = generateInvoicePDF({
        invoice_number: invoiceNumber,
        client_name: client.name,
        provider_name: org.name,
        line_items: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: Math.round(item.rate * 100),
          amount: Math.round(item.quantity * item.rate * 100),
        })),
        subtotal: Math.round(total * 100),
        tax_amount: 0,
        discount_amount: 0,
        total_amount: Math.round(total * 100),
        due_date: dueDate,
        created_at: new Date().toISOString(),
      });

      // Upload PDF to storage
      const pdfPath = `invoices/${org.id}/${invoiceNumber}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('provider-images')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to generate PDF");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('provider-images')
        .getPublicUrl(pdfPath);

      // Create invoice record
      const { data: invoice, error: insertError } = await supabase
        .from("invoices")
        .insert([{
          organization_id: org.id,
          client_id: selectedClient,
          job_id: jobId,
          invoice_number: invoiceNumber,
          amount: Math.round(total * 100),
          due_date: dueDate,
          line_items: lineItems as any,
          notes: notes,
          status: "pending",
          pdf_url: publicUrl,
          email_status: sendEmail ? 'pending' : 'not_sent',
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Generate Stripe Checkout session for payment
      const appUrl = window.location.origin;
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('payments-api', {
        body: {
          action: 'create-payment-checkout',
          amount: Math.round(total * 100),
          currency: 'usd',
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoiceNumber,
            client_id: selectedClient,
            type: 'invoice_payment'
          },
          success_url: `${appUrl}/homeowner/dashboard?payment=success&invoice_id=${invoice.id}`,
          cancel_url: `${appUrl}/homeowner/dashboard?payment=cancelled`,
        }
      });

      if (checkoutError) {
        console.error('Checkout creation error:', checkoutError);
        toast.error("Invoice created but payment link generation failed");
      } else if (checkoutData?.url) {
        // Update invoice with Stripe Checkout URL
        await supabase
          .from('invoices')
          .update({
            stripe_checkout_url: checkoutData.url,
            stripe_checkout_session_id: checkoutData.session_id
          })
          .eq('id', invoice.id);
      }

      // Send email if requested
      if (sendEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-invoice', {
          body: {
            invoiceId: invoice.id,
            clientEmail: client.email,
            pdfUrl: publicUrl,
            paymentUrl: checkoutData?.url || null,
            invoiceNumber: invoiceNumber,
            amount: Math.round(total * 100),
            dueDate: dueDate,
            providerName: org.name,
            clientName: client.name,
          }
        });

        if (emailError) {
          console.error('Email send failed:', emailError);
          toast.error("Invoice created but notification failed. Client can view in their portal.");
        } else {
          toast.success("Invoice created and sent with payment link!");
        }
      } else {
        toast.success("Invoice created with payment link!");
      }

      handleClose();
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast.error(error.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedClient(clientId || "");
    setLineItems([{ description: "", quantity: 1, rate: 0 }]);
    setNotes("");
    setDueDate("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value))}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateLineItem(index, "rate", parseFloat(e.target.value))}
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {lineItems.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or payment terms"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleCreate(false)}
              disabled={loading || !selectedClient}
              className="flex-1"
              variant="outline"
            >
              {loading ? "Creating..." : "Save Draft"}
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={loading || !selectedClient}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Sending..." : "Create & Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
