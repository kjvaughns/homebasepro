import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  onSuccess: () => void;
}

export default function EditJobModal({ open, onOpenChange, job, onSuccess }: EditJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_name: job?.service_name || "",
    date_time_start: job?.date_time_start ? new Date(job.date_time_start) : new Date(),
    date_time_end: job?.date_time_end ? new Date(job.date_time_end) : new Date(),
    estimated_price_low: job?.estimated_price_low || 0,
    estimated_price_high: job?.estimated_price_high || 0,
    notes: job?.notes || "",
    status: job?.status || "pending",
  });

  useEffect(() => {
    if (job) {
      setFormData({
        service_name: job.service_name || "",
        date_time_start: job.date_time_start ? new Date(job.date_time_start) : new Date(),
        date_time_end: job.date_time_end ? new Date(job.date_time_end) : new Date(),
        estimated_price_low: job.estimated_price_low || 0,
        estimated_price_high: job.estimated_price_high || 0,
        notes: job.notes || "",
        status: job.status || "pending",
      });
    }
  }, [job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setLoading(true);
    try {
      // Check if time has changed and verify availability
      const timeChanged = formData.date_time_start.toISOString() !== job.date_time_start || 
                         formData.date_time_end.toISOString() !== job.date_time_end;
      
      if (timeChanged) {
        const { data: available, error: availError } = await supabase
          .rpc('check_provider_availability', {
            p_provider_id: job.provider_org_id,
            p_start_time: formData.date_time_start.toISOString(),
            p_end_time: formData.date_time_end.toISOString()
          });

        if (availError) {
          console.error("Availability check error:", availError);
          throw new Error("Failed to check availability");
        }

        if (!available) {
          toast.error("Time slot unavailable - Provider is not available during this time slot. Please choose a different time.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          service_name: formData.service_name,
          date_time_start: formData.date_time_start.toISOString(),
          date_time_end: formData.date_time_end.toISOString(),
          estimated_price_low: formData.estimated_price_low,
          estimated_price_high: formData.estimated_price_high,
          notes: formData.notes,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw error;

      toast.success("Job updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating job:", error);
      toast.error(error.message || "Failed to update job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service_name">Service Name</Label>
            <Input
              id="service_name"
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <DateTimePicker
                date={formData.date_time_start}
                onDateChange={(date) => date && setFormData({ ...formData, date_time_start: date })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <DateTimePicker
                date={formData.date_time_end}
                onDateChange={(date) => date && setFormData({ ...formData, date_time_end: date })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_low">Price Low ($)</Label>
              <Input
                id="price_low"
                type="number"
                value={formData.estimated_price_low / 100}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_price_low: Math.round(parseFloat(e.target.value) * 100) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_high">Price High ($)</Label>
              <Input
                id="price_high"
                type="number"
                value={formData.estimated_price_high / 100}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_price_high: Math.round(parseFloat(e.target.value) * 100) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
