import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSettings() {
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'check-status' }
      });
      
      if (!error && data) {
        setStripeConnected(data.connected && data.complete);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account-link' }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground">Configure payment processing and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>
            Connect your Stripe account to accept payments from clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeConnected ? (
            <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Stripe Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is ready to accept payments
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-emerald-600">Active</Badge>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Why Connect Stripe?</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Accept credit card and ACH payments</li>
                  <li>• Create payment links and invoices</li>
                  <li>• Automated payment tracking</li>
                  <li>• Secure and compliant processing</li>
                </ul>
              </div>
              
              <Button 
                onClick={handleStripeConnect} 
                disabled={stripeLoading}
                className="w-full"
              >
                {stripeLoading ? "Connecting..." : "Connect Stripe Account"}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                You'll be redirected to Stripe to complete the setup
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
            <Input
              id="payment-terms"
              type="number"
              placeholder="30"
              disabled
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-send Invoices</Label>
              <p className="text-sm text-muted-foreground">
                Automatically email invoices to clients
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Payment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send automated reminder emails
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
