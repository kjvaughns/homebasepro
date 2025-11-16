import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard, Check, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentsSectionProps {
  stripeConnected: boolean;
  stripeLoading: boolean;
  onConnect: () => void;
  onOpenDashboard: () => void;
}

export function PaymentsSection({ 
  stripeConnected, 
  stripeLoading,
  onConnect,
  onOpenDashboard
}: PaymentsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Stripe Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                stripeConnected ? "bg-green-100" : "bg-orange-100"
              )}>
                <CreditCard className={cn(
                  "h-5 w-5",
                  stripeConnected ? "text-green-600" : "text-orange-600"
                )} />
              </div>
              <div>
                <CardTitle className="text-lg">Stripe Account</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {stripeConnected ? 'Connected & Active' : 'Not Connected'}
                </p>
              </div>
            </div>
            {stripeConnected ? (
              <Badge className="bg-green-100 text-green-700">✓ Connected</Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600">Not Setup</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {stripeConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your Stripe account is connected. Manage payouts and view transactions in your dashboard.
              </p>
              <Button variant="outline" onClick={onOpenDashboard}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Accept credit card payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Automatic invoicing and receipts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Fast payouts to your bank</span>
                </li>
              </ul>
              <Button onClick={onConnect} disabled={stripeLoading}>
                {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Preferences - Only show if Stripe connected */}
      {stripeConnected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Payment Due</Label>
                  <p className="text-sm text-muted-foreground">30 days after invoice</p>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Auto-Send Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Send invoices automatically</Label>
                  <p className="text-sm text-muted-foreground">When jobs are completed</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon: Payout Frequency */}
          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payout Frequency
                </CardTitle>
                <Badge variant="secondary" className="text-xs">COMING SOON</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose how often you receive payouts: daily, weekly, or monthly.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
