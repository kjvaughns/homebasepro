import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    provider_id: string;
    name: string;
    logo_url?: string;
    trust_score?: number;
    category?: string;
    city?: string;
  };
  serviceType?: string;
  defaultProperty?: {
    id: string;
    address: string;
    zip: string;
  };
  estimatedPrice?: {
    low: number;
    high: number;
  };
  onSuccess?: () => void;
}

export const BookingDialog = ({
  open,
  onOpenChange,
  provider,
  serviceType = "Service",
  defaultProperty,
  estimatedPrice,
  onSuccess
}: BookingDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>();
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  const timeSlots = [
    { value: "morning", label: "Morning (8am-12pm)" },
    { value: "afternoon", label: "Afternoon (12pm-5pm)" },
    { value: "evening", label: "Evening (5pm-8pm)" }
  ];

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTimeSlot || !defaultProperty) {
      toast.error("Please select a date and time slot");
      return;
    }

    setIsBooking(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Map time slot to actual time range
      const timeRanges = {
        morning: { start: 8, end: 12 },
        afternoon: { start: 12, end: 17 },
        evening: { start: 17, end: 20 }
      };

      const timeRange = timeRanges[selectedTimeSlot as keyof typeof timeRanges];
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(timeRange.start, 0, 0);
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(timeRange.end, 0, 0);

      // Check provider availability before booking
      const { data: isAvailable, error: availError } = await supabase.rpc('check_provider_availability', {
        p_provider_id: provider.provider_id,
        p_start_time: startDateTime.toISOString(),
        p_end_time: endDateTime.toISOString(),
      });

      if (availError) {
        console.error('Error checking availability:', availError);
        // Continue anyway - don't block on availability check failure
      } else if (!isAvailable) {
        toast.error("This time slot is already booked. Please choose a different time.");
        setIsBooking(false);
        return;
      }

      const { error } = await supabase.from('bookings').insert({
        homeowner_profile_id: profile.id,
        provider_org_id: provider.provider_id,
        home_id: defaultProperty.id,
        service_name: serviceType,
        address: defaultProperty.address,
        date_time_start: startDateTime.toISOString(),
        date_time_end: endDateTime.toISOString(),
        estimated_price_low: estimatedPrice?.low,
        estimated_price_high: estimatedPrice?.high,
        notes: notes || null,
        status: 'pending'
      });

      if (error) throw error;

      toast.success("Appointment request sent! The provider will confirm shortly.");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error("Failed to create appointment. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {serviceType}</DialogTitle>
        </DialogHeader>

        {/* Provider Info Header */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={provider.logo_url} alt={provider.name} />
            <AvatarFallback className="bg-primary/10">
              <Building2 className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {provider.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {provider.city}
                </span>
              )}
              {provider.trust_score && (
                <Badge variant="outline" className="gap-1 h-5">
                  <Star className="h-2.5 w-2.5 fill-current text-yellow-500" />
                  {provider.trust_score.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Service & Property Info */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Service</Label>
            <p className="font-medium">{serviceType}</p>
          </div>
          
          {defaultProperty && (
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="font-medium text-sm">{defaultProperty.address}</p>
            </div>
          )}

          {estimatedPrice && (
            <div>
              <Label className="text-xs text-muted-foreground">Estimated Price</Label>
              <p className="font-semibold text-lg">
                ${estimatedPrice.low}–${estimatedPrice.high}
              </p>
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            Select Date
          </Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </div>

        {/* Time Slot Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Select Time
          </Label>
          <div className="grid gap-2">
            {timeSlots.map((slot) => (
              <Button
                key={slot.value}
                variant={selectedTimeSlot === slot.value ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSelectedTimeSlot(slot.value)}
              >
                {slot.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="notes">Special Instructions (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Gate code, pets, access notes, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBooking}>
            Cancel
          </Button>
          <Button onClick={handleConfirmBooking} disabled={isBooking || !selectedDate || !selectedTimeSlot}>
            {isBooking ? "Booking..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
