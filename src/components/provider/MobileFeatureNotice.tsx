import { Alert, AlertDescription } from "@/components/ui/alert";
import { Laptop } from "lucide-react";

export function MobileFeatureNotice() {
  return (
    <Alert className="bg-primary/5 border-primary/20 lg:hidden mb-4">
      <Laptop className="h-4 w-4" />
      <AlertDescription>
        <strong>Desktop Recommended:</strong> Some advanced features like detailed compensation management and payroll processing are optimized for desktop or tablet devices.
      </AlertDescription>
    </Alert>
  );
}