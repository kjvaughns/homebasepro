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
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: ''
  });

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

      // Create Stripe Invoice with payment link
      const { data: stripeInvoiceData, error: stripeError } = await supabase.functions.invoke('create-stripe-invoice', {
        body: {
          clientEmail,
          clientName,
          clientPhone: newClientData?.phone || '',
          lineItems: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate
          })),
          dueDate,
          orgId: org.id,
          stripeAccountId: org.stripe_account_id,
          invoiceId: invoice.id
        }
      });

      if (stripeError) {
        console.error('Stripe invoice creation error:', stripeError);
        const errorMsg = stripeError.error || 'Payment link generation failed';
        
        // Rollback: Delete the database invoice record
        await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id);
        
        toast.error(`Failed to create payment link: ${errorMsg}. Please check your Stripe Connect setup.`);
        return;
      } else if (stripeInvoiceData?.hosted_invoice_url) {
        // Copy payment link to clipboard
        await navigator.clipboard.writeText(stripeInvoiceData.hosted_invoice_url);
        toast.success(`Invoice created! Payment link copied to clipboard. Share it with ${clientName}`);
        
        // Show payment link in console for easy access
        console.log('Stripe Invoice Created:', {
          invoice_id: stripeInvoiceData.stripe_invoice_id,
          payment_url: stripeInvoiceData.hosted_invoice_url,
          pdf_url: stripeInvoiceData.invoice_pdf
        });
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Mode Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={clientMode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('existing')}
            >
              Existing Client
            </Button>
            <Button
              type="button"
              variant={clientMode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('new')}
            >
              + New Client
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
              disabled={
                loading || 
                (clientMode === 'existing' && !selectedClient) || 
                (clientMode === 'new' && (!newClientData.name || !newClientData.email))
              }
              className="flex-1"
              variant="outline"
            >
              {loading ? "Creating..." : "Save Draft"}
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={
                loading || 
                (clientMode === 'existing' && !selectedClient) || 
                (clientMode === 'new' && (!newClientData.name || !newClientData.email))
              }
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
