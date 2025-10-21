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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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
    full_name: "",
    email: "",
    phone: "",
    team_role: "technician",
    pay_type: "hourly",
    pay_rate: "",
    skills: [] as string[],
    zones: [] as string[],
  });
  const [skillInput, setSkillInput] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const { toast } = useToast();

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addZone = () => {
    if (zoneInput.trim() && !formData.zones.includes(zoneInput.trim())) {
      setFormData({ ...formData, zones: [...formData.zones, zoneInput.trim()] });
      setZoneInput("");
    }
  };

  const removeZone = (zone: string) => {
    setFormData({ ...formData, zones: formData.zones.filter(z => z !== zone) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const orgQuery = await (supabase as any)
        .from("organizations")
        .select("id, seats_limit, seats_used")
        .eq("owner_user_id", user.user.id)
        .single();

      const organization = orgQuery.data;
      if (orgQuery.error || !organization) throw new Error("Organization not found");

      // Check seat limit
      if ((organization.seats_used || 0) >= (organization.seats_limit || 1)) {
        toast({
          title: "Seat Limit Reached",
          description: "Upgrade your plan to invite more team members",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if email is already invited
      const existingQuery = await (supabase as any)
        .from("team_members")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("email", formData.email.toLowerCase())
        .maybeSingle();
      
      const existing = existingQuery.data;

      if (existing) {
        toast({
          title: "Already Invited",
          description: "This email has already been invited",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

      // Create team member record
      const { data: teamMember, error: insertError } = await supabase
        .from("team_members")
        .insert({
          organization_id: organization.id,
          full_name: formData.full_name,
          email: formData.email.toLowerCase(),
          phone: formData.phone || null,
          team_role: formData.team_role,
          status: "invited",
          skills: formData.skills.length > 0 ? formData.skills : null,
          zones: formData.zones.length > 0 ? formData.zones : null,
          invite_token: inviteToken,
          invite_expires_at: inviteExpiresAt.toISOString(),
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Create compensation record if pay info provided
      if (formData.pay_rate && parseFloat(formData.pay_rate) > 0 && teamMember) {
        await supabase.from("team_member_compensation").insert({
          team_member_id: teamMember.id,
          organization_id: organization.id,
          pay_type: formData.pay_type,
          pay_rate: parseFloat(formData.pay_rate),
        } as any);
      }

      // Send invitation email via edge function
      if (teamMember) {
        const { error: inviteError } = await supabase.functions.invoke("send-team-invite", {
          body: {
            teamMemberId: teamMember.id,
            email: formData.email,
            name: formData.full_name,
            role: formData.team_role,
            inviteToken,
          },
        });

        if (inviteError) {
          console.error("Error sending invite email:", inviteError);
          // Don't fail the whole operation if email fails
        }
      }

      // Increment seats used
      await supabase
        .from("organizations")
        .update({ seats_used: (organization.seats_used || 1) + 1 } as any)
        .eq("id", organization.id);

      toast({
        title: "Success",
        description: "Team member invitation sent successfully",
      });

      setFormData({
        full_name: "",
        email: "",
        phone: "",
        team_role: "technician",
        pay_type: "hourly",
        pay_rate: "",
        skills: [],
        zones: [],
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Doe"
                required
              />
            </div>

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
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="team_role">Role *</Label>
              <Select
                value={formData.team_role}
                onValueChange={(value) =>
                  setFormData({ ...formData, team_role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="estimator">Estimator/Sales</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role determines permissions and access level
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pay_type">Pay Type</Label>
                <Select
                  value={formData.pay_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, pay_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="per_job">Per Job</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pay_rate">Pay Rate ($)</Label>
                <Input
                  id="pay_rate"
                  type="number"
                  step="0.01"
                  value={formData.pay_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, pay_rate: e.target.value })
                  }
                  placeholder="25.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="skills">Skills</Label>
              <div className="flex gap-2">
                <Input
                  id="skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="e.g., Plumbing, HVAC"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() => removeSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="zones">Service Zones</Label>
              <div className="flex gap-2">
                <Input
                  id="zones"
                  value={zoneInput}
                  onChange={(e) => setZoneInput(e.target.value)}
                  placeholder="e.g., Downtown, North Side"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addZone();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addZone}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.zones.map((zone) => (
                  <Badge key={zone} variant="secondary">
                    {zone}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() => removeZone(zone)}
                    />
                  </Badge>
                ))}
              </div>
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
