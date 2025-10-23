import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmbeddedConnectOnboarding from "@/components/provider/EmbeddedConnectOnboarding";

export default function PaymentSettings() {
  const [stripeConnected, setStripeConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    try {
      setCheckingStatus(true);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const invokePromise = supabase.functions.invoke('stripe-connect', {
        body: { action: 'check-status' }
      });
      
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error checking Stripe status:', error);
        toast({
          title: "Connection Error",
          description: "Unable to check Stripe status. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Check for error response format
      if (data?.ok === false) {
        console.error('Status check failed:', data.message);
        toast({
          variant: "destructive",
          title: "Status Check Failed",
          description: data.message || "Unable to verify Stripe connection",
        });
        return;
      }
      
      // Check both complete status and payments_ready
      if (data?.success && data?.paymentsReady) {
        setStripeConnected(true);
      } else if (data?.success && data?.detailsSubmitted && !data?.paymentsReady) {
        // Onboarding submitted but not yet ready
        toast({
          title: "Payment Setup In Progress",
          description: "Your account is being reviewed by Stripe. This usually takes a few minutes.",
        });
      } else if (data?.connected && data?.complete) {
        // Legacy format support
        setStripeConnected(true);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check Stripe status",
        variant: "destructive"
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    checkStripeStatus();
    toast({
      title: "Success!",
      description: "Stripe account connected successfully"
    });
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
          {checkingStatus ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stripeConnected ? (
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
                onClick={() => setShowOnboarding(true)}
                className="w-full"
              >
                Connect Stripe Account
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Complete setup directly in the app
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Embedded Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <EmbeddedConnectOnboarding onComplete={handleOnboardingComplete} />
        </DialogContent>
      </Dialog>

      <Card>
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
