import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Laptop, DollarSign, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InviteTeamMemberDialog } from "@/components/provider/InviteTeamMemberDialog";
import { TeamMemberCard } from "@/components/provider/TeamMemberCard";
import { ManageCompensationDialog } from "@/components/provider/ManageCompensationDialog";

interface TeamMember {
  id: string;
  invited_email: string;
  role: string;
  team_role: string;
  status: string;
  invited_at: string;
  permissions: any;
}

interface Compensation {
  id: string;
  team_member_id: string;
  pay_type: string;
  pay_rate: number;
  direct_deposit_enabled: boolean;
  bank_account_last4: string;
}

export default function Team() {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [compensations, setCompensations] = useState<{ [key: string]: Compensation }>({});
  const [loading, setLoading] = useState(true);
  const [planTier, setPlanTier] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showCompensationDialog, setShowCompensationDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [teamLimit, setTeamLimit] = useState(0);
  const [canInviteMore, setCanInviteMore] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.user.id)
        .single();

      if (!organization) return;
      setOrganizationId(organization.id);

      // BUG-004 FIX: Load organization team limits
      const { data: orgData } = await supabase
        .from("organizations")
        .select("plan, team_limit")
        .eq("id", organization.id)
        .single();

      if (orgData) {
        setPlanTier(orgData.plan || '');
        setTeamLimit(orgData.team_limit || 0);
      }

      // Load team members
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("organization_id", organization.id)
        .order("invited_at", { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);

      // Load compensations for all team members
      const { data: compensationData } = await supabase
        .from("team_member_compensation")
        .select("*")
        .eq("organization_id", organization.id);

      const compensationMap: { [key: string]: Compensation } = {};
      compensationData?.forEach(comp => {
        compensationMap[comp.team_member_id] = comp;
      });
      setCompensations(compensationMap);
      
      // BUG-004 FIX: Check if can invite more based on current count vs limit
      const activeCount = (data || []).filter(m => m.status === 'invited' || m.status === 'active').length;
      setCanInviteMore(activeCount < (teamLimit || 0));
    } catch (error) {
      console.error("Error loading team:", error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isTeamFeatureAvailable = ["growth", "pro", "scale"].includes(planTier);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Desktop Feature Notice */}
      <Alert className="bg-primary/5 border-primary/20 lg:hidden">
        <Laptop className="h-4 w-4" />
        <AlertDescription>
          Full team management features including compensation and payroll are best accessed on desktop or tablet.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
          <p className="text-sm text-muted-foreground">Manage team members, compensation, and payroll</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {isTeamFeatureAvailable && (
            <>
              {canInviteMore ? (
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Team Member
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/provider/settings/billing')}
                  variant="default"
                  className="flex-1 sm:flex-none"
                >
                  Upgrade Plan
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none"
                onClick={() => navigate("/provider/payroll")}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Payroll</span>
              </Button>
              <Button 
                className="flex-1 sm:flex-none"
                onClick={() => setShowInviteDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </>
          )}
        </div>
      </div>

      {!isTeamFeatureAvailable && (
        <Alert>
          <AlertDescription>
            Team management is only available on Growth+ plans.{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/pricing")}
            >
              Upgrade now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : !isTeamFeatureAvailable ? (
        <div className="text-center py-12 border rounded-lg opacity-50">
          <h3 className="text-lg font-semibold mb-2">Team feature locked</h3>
          <p className="text-muted-foreground mb-2">
            Upgrade to Growth+ to invite team members
          </p>
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => navigate("/pricing")}
          >
            View Plans
          </Button>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground mb-4">
            Invite team members to collaborate
          </p>
          <Button onClick={() => setShowInviteDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              compensation={compensations[member.id]}
              onManageCompensation={() => {
                setSelectedMember(member);
                setShowCompensationDialog(true);
              }}
              onManagePermissions={() => {
                toast({
                  title: "Coming Soon",
                  description: "Permission management available on desktop",
                });
              }}
            />
          ))}
        </div>
      )}

      <InviteTeamMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSuccess={loadTeamData}
      />

      {selectedMember && (
        <ManageCompensationDialog
          open={showCompensationDialog}
          onOpenChange={setShowCompensationDialog}
          teamMemberId={selectedMember.id}
          organizationId={organizationId}
          currentCompensation={compensations[selectedMember.id]}
          onSuccess={loadTeamData}
        />
      )}
    </div>
  );
}
