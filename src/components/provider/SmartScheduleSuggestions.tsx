import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Clock, MapPin, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface SmartScheduleSuggestionsProps {
  date: Date;
  serviceEstimatedDuration?: number;
  onSelectSlot?: (start: Date, end: Date) => void;
}

interface TimeSlot {
  start: Date;
  end: Date;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  distance_from_last?: number;
}

export function SmartScheduleSuggestions({ 
  date, 
  serviceEstimatedDuration = 120,
  onSelectSlot 
}: SmartScheduleSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, [date]);

  const loadSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      // Get existing bookings for the day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("date_time_start, date_time_end, address, lat, lng")
        .eq("provider_org_id", org.id)
        .gte("date_time_start", dayStart.toISOString())
        .lte("date_time_start", dayEnd.toISOString())
        .order("date_time_start");

      // Generate smart suggestions
      const slots: TimeSlot[] = [];
      
      if (!existingBookings || existingBookings.length === 0) {
        // No existing bookings - suggest optimal start times
        slots.push({
          start: setTime(date, 8, 0),
          end: setTime(date, 8 + Math.ceil(serviceEstimatedDuration / 60), 0),
          reason: "Optimal morning start time",
          confidence: 'high'
        });
        slots.push({
          start: setTime(date, 10, 0),
          end: setTime(date, 10 + Math.ceil(serviceEstimatedDuration / 60), 0),
          reason: "Mid-morning availability",
          confidence: 'high'
        });
        slots.push({
          start: setTime(date, 13, 0),
          end: setTime(date, 13 + Math.ceil(serviceEstimatedDuration / 60), 0),
          reason: "After lunch availability",
          confidence: 'medium'
        });
      } else {
        // Find gaps between existing bookings
        let lastEnd = setTime(date, 8, 0); // Start of day

        for (const booking of existingBookings) {
          const bookingStart = new Date(booking.date_time_start);
          const gapMinutes = (bookingStart.getTime() - lastEnd.getTime()) / (1000 * 60);

          if (gapMinutes >= serviceEstimatedDuration + 30) { // 30 min buffer
            const suggestedStart = new Date(lastEnd.getTime() + 15 * 60 * 1000); // 15 min after last
            const suggestedEnd = new Date(suggestedStart.getTime() + serviceEstimatedDuration * 60 * 1000);

            slots.push({
              start: suggestedStart,
              end: suggestedEnd,
              reason: `${Math.round(gapMinutes)} min gap available`,
              confidence: gapMinutes >= serviceEstimatedDuration * 1.5 ? 'high' : 'medium'
            });
          }

          lastEnd = new Date(booking.date_time_end);
        }

        // Check for time after last booking
        const endOfDay = setTime(date, 18, 0);
        const remainingMinutes = (endOfDay.getTime() - lastEnd.getTime()) / (1000 * 60);
        
        if (remainingMinutes >= serviceEstimatedDuration) {
          const suggestedStart = new Date(lastEnd.getTime() + 15 * 60 * 1000);
          const suggestedEnd = new Date(suggestedStart.getTime() + serviceEstimatedDuration * 60 * 1000);

          slots.push({
            start: suggestedStart,
            end: suggestedEnd,
            reason: "End of day availability",
            confidence: 'medium'
          });
        }
      }

      setSuggestions(slots.slice(0, 3)); // Top 3 suggestions
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const setTime = (date: Date, hours: number, minutes: number): Date => {
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default" className="bg-green-500">Best Match</Badge>;
      case 'medium':
        return <Badge variant="secondary">Good Match</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Analyzing your schedule...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No available time slots found for this date. Try another day.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Schedule Suggestions
        </CardTitle>
        <CardDescription>
          Optimized time slots based on your existing schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((slot, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}
                </span>
                {getConfidenceBadge(slot.confidence)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {slot.reason}
              </p>
            </div>
            {onSelectSlot && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectSlot(slot.start, slot.end)}
              >
                Select
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
