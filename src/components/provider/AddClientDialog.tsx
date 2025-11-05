import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SeatLimitModal } from "./SeatLimitModal";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddClientDialog({ open, onOpenChange, onSuccess }: AddClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [orgPlan, setOrgPlan] = useState("free");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const { toast } = useToast();
  const { isAdmin } = useAdminCheck();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: organization } = await supabase
        .from("organizations")
        .select("id, plan")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) throw new Error("Organization not found");

      setOrgPlan(organization.plan || "free");

      // Database trigger will enforce limits, this is just for early feedback
      const { data: existingClients } = await supabase
        .from("clients")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("status", "active");

      const clientCount = existingClients?.length || 0;
      const plan = organization.plan || "free";
      
      // Skip limit check for admins
      if (plan === "free" && !isAdmin && clientCount >= 5) {
        toast({
          title: 'Client limit reached',
          description: 'Free plan is limited to 5 clients. Upgrade to Growth plan for unlimited clients.',
          variant: 'destructive',
        });
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("clients").insert({
        organization_id: organization.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });

      if (error) {
        // Check if error is from database trigger
        if (error.message?.includes("Client limit reached")) {
          setShowUpgradeModal(true);
          setLoading(false);
          return;
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "Client added successfully",
      });

      setFormData({ name: "", email: "", phone: "", address: "", notes: "" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding client:", error);
      toast({
        title: "Error",
        description: "Failed to add client",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeatLimitModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={orgPlan}
        seatsUsed={0}
        seatsLimit={5}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Add a new client to your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <AddressAutocomplete
                label="Address"
                placeholder="Start typing the address..."
                defaultValue={formData.address}
                onAddressSelect={(address) => {
                  setFormData({ ...formData, address: address.fullAddress });
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
