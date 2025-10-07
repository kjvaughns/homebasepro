import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddSubscriptionDialog } from "@/components/provider/AddSubscriptionDialog";
import { RecordPaymentDialog } from "@/components/provider/RecordPaymentDialog";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
  service_plans: {
    name: string;
    price: number;
    billing_frequency: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  fee_amount: number;
  payment_date: string;
  status: string;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>();

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;

      // Load client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Load subscriptions
      const { data: subsData } = await supabase
        .from("client_subscriptions")
        .select(
          `
          *,
          service_plans (name, price, billing_frequency)
        `
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      setSubscriptions(subsData || []);

      // Load payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .in(
          "client_subscription_id",
          (subsData || []).map((s) => s.id)
        )
        .order("payment_date", { ascending: false });

      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error loading client:", error);
      toast({
        title: "Error",
        description: "Failed to load client details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/provider/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <Badge variant={client.status === "active" ? "default" : "secondary"}>
            {client.status}
          </Badge>
        </div>
        <Button onClick={() => setShowSubscriptionDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Subscriptions:</span>
              <span className="font-medium">
                {subscriptions.filter((s) => s.status === "active").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Payments:</span>
              <span className="font-medium">
                ${(payments.reduce((sum, p) => sum + p.amount, 0) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client Since:</span>
              <span className="font-medium">
                {new Date(client.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscriptions</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSubscriptionDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              No subscriptions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Billing</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.service_plans.name}
                    </TableCell>
                    <TableCell>
                      ${(sub.service_plans.price / 100).toFixed(2)}/
                      {sub.service_plans.billing_frequency}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === "active" ? "default" : "secondary"
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.next_billing_date
                        ? new Date(sub.next_billing_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedSubscriptionId(sub.id);
                          setShowPaymentDialog(true);
                        }}
                      >
                        Record Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              No payments recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${(payment.amount / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">
                      -${(payment.fee_amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${((payment.amount - payment.fee_amount) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "completed" ? "default" : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddSubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        onSuccess={loadClientData}
        preSelectedClientId={client.id}
      />

      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={loadClientData}
        preSelectedSubscriptionId={selectedSubscriptionId}
      />
    </div>
  );
}
