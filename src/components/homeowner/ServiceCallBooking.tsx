import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Clock, DollarSign, Wrench } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ServiceCallBookingProps {
  serviceRequestId: string;
  providerId: string;
  providerName: string;
  homeId: string;
  problemDescription: string;
  diagnosticFee?: number;
  onSuccess?: () => void;
}

export function ServiceCallBooking({
  serviceRequestId,
  providerId,
  providerName,
  homeId,
  problemDescription,
  diagnosticFee = 9900, // Default $99.00
  onSuccess
}: ServiceCallBookingProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isBooking, setIsBooking] = useState(false);

  const handleBookServiceCall = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setIsBooking(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create service call
      const { data: serviceCall, error } = await supabase
        .from("service_calls")
        .insert({
          service_request_id: serviceRequestId,
          provider_org_id: providerId,
          homeowner_id: profile.id,
          home_id: homeId,
          scheduled_date: selectedDate.toISOString(),
          diagnostic_fee: diagnosticFee,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Diagnostic service call scheduled!");
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/homeowner/appointments/${serviceCall.id}`);
      }
    } catch (error) {
      console.error("Error booking service call:", error);
      toast.error("Failed to book service call");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Book Diagnostic Service Call
        </CardTitle>
        <CardDescription>
          {providerName} will diagnose your problem and provide a detailed quote
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Flat-Rate Diagnostic Fee</p>
              <p className="text-2xl font-bold text-primary">
                ${(diagnosticFee / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This fee covers the diagnosis and quote generation. If you approve the quote, 
                this amount may be credited toward the full service.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">What to Expect</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Technician will assess your issue</li>
                <li>• Receive detailed diagnosis with photos</li>
                <li>• Get itemized quote for recommended repairs</li>
                <li>• No obligation to proceed with full service</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Select Date & Time</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="rounded-lg border border-border/50 bg-card p-3">
          <p className="text-sm font-medium mb-2">Your Issue:</p>
          <p className="text-sm text-muted-foreground">{problemDescription}</p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={handleBookServiceCall}
          disabled={!selectedDate || isBooking}
          className="flex-1"
        >
          {isBooking ? "Booking..." : `Book for ${selectedDate ? format(selectedDate, "PPP") : "Selected Date"}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
