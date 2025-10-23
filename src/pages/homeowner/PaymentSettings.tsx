import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodManager } from "@/components/homeowner/PaymentMethodManager";

export default function PaymentSettings() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Methods</h1>
        <p className="text-muted-foreground mt-2">
          Manage your saved payment methods for faster checkout
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
          <CardDescription>
            Add a payment method to quickly book services without entering card details each time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodManager />
        </CardContent>
      </Card>
    </div>
  );
}
