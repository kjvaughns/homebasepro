import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus } from "lucide-react";
import InviteAdminDialog from "@/components/admin/InviteAdminDialog";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

interface AdminInvite {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  invited_at: string;
}

const TeamManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      // Fetch active admins
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .in("role", ["admin", "moderator"]);

      if (rolesError) throw rolesError;

      // Fetch profile info for each user
      const enrichedData = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", role.user_id)
            .single();

          return {
            ...role,
            profiles: profile || { full_name: "Unknown User" },
          };
        }),
      );

      setAdmins(enrichedData);

      // Fetch pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from("admin_invites")
        .select("*")
        .eq("status", "pending")
        .order("invited_at", { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRemoveAdmin = async (roleId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_user_id: user?.id,
        action: "remove_admin",
        table_name: "user_roles",
        record_id: roleId,
      });

      toast({
        title: "Admin removed",
        description: "Admin access has been revoked",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error removing admin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invite?")) return;

    try {
      const { error } = await supabase
        .from("admin_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);

      if (error) throw error;

      toast({
        title: "Invite revoked",
        description: "The invite has been cancelled",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error revoking invite",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage admin users and invites</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.profiles?.full_name || "Unknown User"}</TableCell>
                    <TableCell>
                      <Badge variant={admin.role === "admin" ? "default" : "secondary"}>
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveAdmin(admin.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.full_name}</TableCell>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell>{new Date(invite.invited_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleRevokeInvite(invite.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <InviteAdminDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default TeamManagement;
