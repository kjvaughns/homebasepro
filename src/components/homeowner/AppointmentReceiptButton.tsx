import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateReceipt } from "@/utils/generateReceipt";

interface AppointmentReceiptButtonProps {
  visit: any;
  homeownerName: string;
}

export function AppointmentReceiptButton({ visit, homeownerName }: AppointmentReceiptButtonProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    try {
      // Calculate pricing from visit data
      const subtotal = visit.total_cost || 0;
      const fee = Math.round(subtotal * 0.05); // 5% platform fee
      const total = subtotal + fee;

      generateReceipt({
        bookingId: visit.id,
        serviceName: visit.service_type || "Service Visit",
        providerName: visit.organizations?.name || "Provider",
        date: new Date(visit.scheduled_date).toLocaleDateString(),
        homeownerName,
        address: visit.homes?.address || "—",
        subtotal,
        tip: 0,
        fee,
        total,
      });

      toast({
        title: "Receipt Downloaded",
        description: "Your receipt has been saved as a PDF",
      });
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
    }
  };

  if (visit.status !== "completed") {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      className="mt-2"
    >
      <Download className="h-4 w-4 mr-2" />
      Download Receipt
    </Button>
  );
}
