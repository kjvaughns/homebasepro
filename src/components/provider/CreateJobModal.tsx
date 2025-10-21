import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  onSuccess: () => void;
}

export default function CreateJobModal({
  open,
  onOpenChange,
  client,
  onSuccess,
}: CreateJobModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_name: "",
    scheduled_date: "",
    status: "quoted",
    quote_amount: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.service_name || !formData.scheduled_date) return;

    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("Organization not found");

      const { error } = await supabase.from("bookings").insert({
        provider_organization_id: profile.organization_id,
        homeowner_profile_id: client.homeowner_profile_id,
        service_name: formData.service_name,
        scheduled_date: formData.scheduled_date,
        status: formData.status,
        quote_amount: formData.quote_amount ? parseFloat(formData.quote_amount) : null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Job created",
        description: `${formData.service_name} has been scheduled`,
      });
      
      setFormData({
        service_name: "",
        scheduled_date: "",
        status: "quoted",
        quote_amount: "",
        notes: "",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("Error creating job:", error);
      toast({
        title: "Failed to create job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Job for {client.name}</DialogTitle>
            <DialogDescription>
              Schedule a new service or create a quote
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="service_name">Service *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) =>
                  setFormData({ ...formData, service_name: e.target.value })
                }
                placeholder="e.g., Lawn Mowing, Gutter Cleaning"
                required
              />
            </div>

            <div>
              <Label htmlFor="scheduled_date">Date *</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_date: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quote_amount">Quote Amount ($)</Label>
              <Input
                id="quote_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.quote_amount}
                onChange={(e) =>
                  setFormData({ ...formData, quote_amount: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional details about this job..."
                rows={3}
              />
            </div>

            {client.property_address && (
              <div className="text-sm text-muted-foreground">
                <strong>Property:</strong> {client.property_address}, {client.property_city}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || !formData.service_name || !formData.scheduled_date
              }
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
