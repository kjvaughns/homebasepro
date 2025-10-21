import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Calendar } from "lucide-react";

interface ClientBillingTabProps {
  client: any;
  subscriptions: any[];
  payments: any[];
}

export default function ClientBillingTab({
  client,
  subscriptions,
  payments,
}: ClientBillingTabProps) {
  const unpaidPayments = payments.filter((p) => p.status !== "completed");
  const outstandingBalance = unpaidPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Outstanding Balance */}
      {outstandingBalance > 0 && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-destructive">
                Outstanding Balance
              </div>
              <div className="text-2xl font-bold text-destructive">
                ${outstandingBalance.toLocaleString()}
              </div>
            </div>
            <Button variant="destructive">
              <DollarSign className="h-4 w-4 mr-2" />
              Collect Payment
            </Button>
          </div>
        </Card>
      )}

      {/* Active Subscriptions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Subscriptions</h3>
        {subscriptions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No active subscriptions
          </Card>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">{sub.service_plan?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {sub.service_plan?.description}
                    </div>
                  </div>
                  <Badge>{sub.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    ${sub.service_plan?.price_per_visit}/visit
                  </div>
                  {sub.next_billing_date && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Next: {new Date(sub.next_billing_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Payment History</h3>
        {payments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No payment history
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <Card key={payment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        payment.status === "completed"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-orange-500/10 text-orange-500"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">
                        ${payment.amount?.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      payment.status === "completed" ? "default" : "secondary"
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Billing Summary
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Lifetime Value</span>
            <span className="font-medium">
              ${client.lifetime_value?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Total Payments</span>
            <span className="font-medium">{payments.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Completed Payments</span>
            <span className="font-medium">
              {payments.filter((p) => p.status === "completed").length}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Outstanding</span>
            <span className="font-medium text-destructive">
              ${outstandingBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
