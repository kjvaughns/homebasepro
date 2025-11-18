import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock } from "lucide-react";

interface BlockTimeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: Date;
}

export function BlockTimeModal({ open, onClose, onSuccess, defaultDate }: BlockTimeModalProps) {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(
    defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [endTime, setEndTime] = useState("17:00");
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const startAt = `${startDate}T${startTime}:00`;
      const endAt = `${endDate}T${endTime}:00`;

      if (new Date(endAt) <= new Date(startAt)) {
        toast.error("End time must be after start time");
        return;
      }

      const { error } = await supabase.functions.invoke('create-time-block', {
        body: { start_at: startAt, end_at: endAt, note }
      });

      if (error) throw error;

      toast.success("Time blocked successfully");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error blocking time:", error);
      toast.error(error.message || "Failed to block time");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Block Off Time
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea
              placeholder="e.g., Lunch break, Personal appointment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Blocking..." : "Block Time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}