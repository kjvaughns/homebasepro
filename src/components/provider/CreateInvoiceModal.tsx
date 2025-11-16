import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { generateInvoicePDF } from "@/utils/generateInvoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Send, Eye } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";
import { PaymentLinkDialog } from "./PaymentLinkDialog";

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  jobId?: string;
  onSuccess?: () => void;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export function CreateInvoiceModal({ open, onClose, clientId, jobId, onSuccess }: CreateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(clientId || "");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientMode, setClientMode] = useState<'existing' | 'new' | 'linkOnly'>('existing');
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showPaymentLinkDialog, setShowPaymentLinkDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState("");
  const [generatedClientName, setGeneratedClientName] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

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

  const calculateNetAfterFees = (total: number) => {
    const stripeFee = total * 0.029 + 30; // 2.9% + $0.30
    return total - stripeFee;
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

      // Validate line items before submission
      const totalAmount = calculateTotal();
      if (totalAmount < 0.50) {
        toast.error(`Invoice total must be at least $0.50 (current: $${totalAmount.toFixed(2)})`);
        setLoading(false);
        return;
      }

      for (const item of lineItems) {
        if (!item.description.trim()) {
          toast.error('All line items must have a description');
          setLoading(false);
          return;
        }
        if (item.quantity < 1) {
          toast.error('Quantity must be at least 1');
          setLoading(false);
          return;
        }
        if (item.rate <= 0) {
          toast.error('Rate must be greater than $0');
          setLoading(false);
          return;
        }
      }

      let clientId = selectedClient;
      let clientEmail = '';
      let clientName = '';

      // If creating new client, insert first
      if (clientMode === 'new') {
        if (!newClientData.name || !newClientData.email) {
          toast.error('Please enter client name and email');
          return;
        }

        // Check for duplicate email
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', org.id)
          .eq('email', newClientData.email)
          .single();

        if (existingClient) {
          toast.error('A client with this email already exists');
          return;
        }

        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            organization_id: org.id,
            name: newClientData.name,
            email: newClientData.email,
            phone: newClientData.phone || null,
            status: 'active'
          })
          .select()
          .single();

        if (clientError) {
          toast.error('Failed to create client: ' + clientError.message);
          return;
        }

        clientId = newClient.id;
        clientEmail = newClient.email;
        clientName = newClient.name;
        
        toast.success('Client created successfully');
      } else {
        const { data: client } = await supabase
          .from("clients")
          .select("email, name")
          .eq("id", selectedClient)
          .single();

        if (!client) {
          toast.error("Client not found");
          return;
        }

        clientEmail = client.email;
        clientName = client.name;
      }

      const total = calculateTotal();
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice record first
      const { data: invoice, error: insertError } = await supabase
        .from("invoices")
        .insert([{
          organization_id: org.id,
          client_id: clientId,
          job_id: jobId,
          invoice_number: invoiceNumber,
          amount: Math.round(total * 100),
          due_date: dueDate,
          line_items: lineItems as any,
          notes: notes,
          status: "pending",
          email_status: sendEmail ? 'pending' : 'not_sent',
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Create payment link using payments-api
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "payments-api",
        {
          body: {
            action: "payment-link",
            organizationId: org.id,
            stripeAccountId: org.stripe_account_id,
            clientEmail,
            clientName,
            lineItems: lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              amount: Math.round(item.rate * item.quantity * 100) // Total in cents
            })),
            invoiceId: invoice.id,
            dueDate: dueDate || undefined,
            successUrl: `${window.location.origin}/invoice/${invoice.id}/success`,
            cancelUrl: `${window.location.origin}/provider/accounting`
          },
        }
      );

      if (paymentError) {
        console.error('Payment link creation error:', paymentError);
        
        // Extract detailed error message
        let errorMsg = 'Payment link generation failed';
        
        if (paymentError.message) {
          errorMsg = paymentError.message;
        } else if (typeof paymentError === 'string') {
          errorMsg = paymentError;
        } else if (paymentError.error) {
          errorMsg = paymentError.error;
        }
        
        // Rollback: Delete the database invoice record
        await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id);
        
        toast.error(`Failed to create payment link: ${errorMsg}`);
        return;
      } else if (paymentData?.url) {
        // Try auto-copy with fallback to dialog
        const copyResult = await copyToClipboard(paymentData.url);
        
        // Update invoice with Stripe payment link URL
        await supabase
          .from('invoices')
          .update({
            stripe_checkout_session_id: paymentData.sessionId,
            stripe_checkout_url: paymentData.url,
            stripe_session_id: paymentData.sessionId
          })
          .eq('id', invoice.id);
        
        // Show payment link in console for easy access
        console.log('Stripe Payment Link Created:', {
          session_id: paymentData.sessionId,
          payment_url: paymentData.url
        });
        
        if (copyResult.success) {
          // Send email if requested
          if (sendEmail && invoice.id) {
            try {
              const { error: emailError } = await supabase.functions.invoke('send-invoice-email', {
                body: { invoiceId: invoice.id }
              });

              if (emailError) throw emailError;
              toast.success(`Payment link created and emailed to ${clientName}!`);
            } catch (emailError: any) {
              console.error("Error sending email:", emailError);
              toast.warning(`Payment link created but email failed to send. URL copied to clipboard.`);
            }
          } else {
            toast.success(`Payment link created! URL copied to clipboard. Share it with ${clientName}`);
          }
          handleClose();
        } else {
          // Auto-copy failed, show dialog with manual copy button
          setGeneratedPaymentLink(paymentData.url);
          setGeneratedClientName(clientName);
          setShowPaymentLinkDialog(true);
          toast.info('Payment link created! Click "Copy Link" to copy it.');
          return; // Don't close modal yet
        }
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
    setClientMode('existing');
    setNewClientData({ name: '', email: '', phone: '' });
    onClose();
  };

  return (
    <>
      <PaymentLinkDialog
        open={showPaymentLinkDialog}
        onClose={() => {
          setShowPaymentLinkDialog(false);
          handleClose();
        }}
        paymentUrl={generatedPaymentLink}
        clientName={generatedClientName}
      />
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={clientMode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('existing')}
              type="button"
            >
              Existing Client
            </Button>
            <Button
              variant={clientMode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('new')}
              type="button"
            >
              New Client
            </Button>
            <Button
              variant={clientMode === 'linkOnly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('linkOnly')}
              type="button"
            >
              Link Only
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Client Selection or New Client Form */}
            {clientMode === 'existing' ? (
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
            ) : (
              <div className="col-span-2 space-y-3">
                <div>
                  <Label>Client Name *</Label>
                  <Input
                    placeholder="John Doe"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Phone Number (optional)</Label>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                  />
                </div>
              </div>
            )}

            {clientMode === 'existing' && (
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {clientMode === 'new' && (
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

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

          {/* Live Total Preview */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>After 2.9% + $0.30 fees:</span>
              <span className="font-semibold text-green-600">
                ${calculateNetAfterFees(calculateTotal()).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={loading || (!selectedClient && clientMode !== 'linkOnly')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleCreate(false)}
            disabled={loading || (!selectedClient && clientMode !== 'linkOnly')}
          >
            {loading ? "Creating..." : "Create Link Only"}
          </Button>
          <Button
            type="button"
            onClick={() => handleCreate(true)}
            disabled={loading || (!selectedClient && clientMode !== 'linkOnly')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Sending..." : "Send via Email"}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
