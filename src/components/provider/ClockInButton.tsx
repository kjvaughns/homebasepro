import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ClockInButtonProps {
  teamMemberId?: string;
  jobId?: string;
  onClockIn?: () => void;
  onClockOut?: () => void;
}

export function ClockInButton({
  teamMemberId,
  jobId,
  onClockIn,
  onClockOut,
}: ClockInButtonProps) {
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const { toast } = useToast();

  useEffect(() => {
    if (teamMemberId) {
      loadCurrentEntry();
    }
  }, [teamMemberId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentEntry) {
      interval = setInterval(() => {
        const start = new Date(currentEntry.clock_in_at);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentEntry]);

  const loadCurrentEntry = async () => {
    try {
      const { data } = await (supabase as any)
        .from("time_entries")
        .select("*")
        .eq("team_member_id", teamMemberId)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentEntry(data);
    } catch (error) {
      console.error("Error loading current entry:", error);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const orgQuery = await (supabase as any)
        .from("organizations")
        .select("id")
        .eq("owner_user_id", user.user.id)
        .single();

      let geoLat = null;
      let geoLng = null;

      // Try to get GPS coordinates
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          geoLat = position.coords.latitude;
          geoLng = position.coords.longitude;
        } catch (error) {
          console.log("GPS not available:", error);
        }
      }

      const { data: entry, error } = await (supabase as any)
        .from("time_entries")
        .insert({
          team_member_id: teamMemberId,
          organization_id: orgQuery.data.id,
          job_id: jobId || null,
          clock_in_at: new Date().toISOString(),
          geo_in_lat: geoLat,
          geo_in_lng: geoLng,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(entry);
      toast({
        title: "Clocked In",
        description: "Your time is now being tracked",
      });
      onClockIn?.();
    } catch (error) {
      console.error("Error clocking in:", error);
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    setLoading(true);
    try {
      let geoLat = null;
      let geoLng = null;

      // Try to get GPS coordinates
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          geoLat = position.coords.latitude;
          geoLng = position.coords.longitude;
        } catch (error) {
          console.log("GPS not available:", error);
        }
      }

      const { error } = await (supabase as any)
        .from("time_entries")
        .update({
          clock_out_at: new Date().toISOString(),
          geo_out_lat: geoLat,
          geo_out_lng: geoLng,
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      setElapsedTime("00:00:00");
      toast({
        title: "Clocked Out",
        description: "Time entry recorded successfully",
      });
      onClockOut?.();
    } catch (error) {
      console.error("Error clocking out:", error);
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentEntry) {
    return (
      <div className="space-y-2">
        <Badge variant="default" className="w-full justify-center py-2 text-lg">
          {elapsedTime}
        </Badge>
        <Button
          onClick={handleClockOut}
          disabled={loading}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          <StopCircle className="mr-2 h-5 w-5" />
          Clock Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClockIn}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      <Clock className="mr-2 h-5 w-5" />
      Clock In
    </Button>
  );
}