import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeamMember {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  invited_at: string;
}

export default function Team() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [planTier, setPlanTier] = useState<string>("");
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

      // Load subscription tier
      const { data: subscription } = await supabase
        .from("organization_subscriptions")
        .select("plan_tier")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .single();

      if (subscription) {
        setPlanTier(subscription.plan_tier);
      }

      // Load team members
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("organization_id", organization.id)
        .order("invited_at", { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
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

  const isTeamFeatureAvailable = planTier === "growth";

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        {isTeamFeatureAvailable && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {!isTeamFeatureAvailable && (
        <Alert>
          <AlertDescription>
            Team management is only available on the Growth+ plan.{" "}
            <Button variant="link" className="p-0 h-auto">
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
          <p className="text-muted-foreground">
            Upgrade to Growth+ to invite team members
          </p>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground mb-4">
            Invite team members to collaborate
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.invited_email}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>
                  <Badge
                    variant={member.status === "active" ? "default" : "secondary"}
                  >
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(member.invited_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
