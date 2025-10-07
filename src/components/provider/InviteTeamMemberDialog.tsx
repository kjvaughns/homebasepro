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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteTeamMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) throw new Error("Organization not found");

      // Check if email is already invited
      const { data: existing } = await supabase
        .from("team_members")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("invited_email", formData.email.toLowerCase())
        .single();

      if (existing) {
        toast({
          title: "Already Invited",
          description: "This email has already been invited",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("team_members").insert({
        organization_id: organization.id,
        invited_email: formData.email.toLowerCase(),
        role: formData.role,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member invitation sent",
      });

      setFormData({
        email: "",
        role: "member",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error inviting team member:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="member@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Members can view and manage clients. Admins have full access.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
