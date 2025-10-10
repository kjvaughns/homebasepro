import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InviteBetaUserDialog } from "@/components/admin/InviteBetaUserDialog";
import { Shield, UserX, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

type BetaAccess = {
  id: string;
  email: string;
  user_type: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  notes: string | null;
};

const BetaAccess = () => {
  const [invites, setInvites] = useState<BetaAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('beta_access')
        .select('*')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load invites",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();

    const channel = supabase
      .channel('beta_access_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beta_access' }, () => {
        loadInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRevoke = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from('beta_access')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Access revoked",
        description: `${email}'s beta access has been revoked`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to revoke access",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "outline", icon: Clock, label: "Pending" },
      accepted: { variant: "default", icon: CheckCircle2, label: "Accepted" },
      revoked: { variant: "destructive", icon: XCircle, label: "Revoked" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    pending: invites.filter(i => i.status === 'pending').length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    revoked: invites.filter(i => i.status === 'revoked').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Beta Access Management
          </h1>
          <p className="text-muted-foreground">Manage user invitations and registration access</p>
        </div>
        <InviteBetaUserDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revoked}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invitations</CardTitle>
          <CardDescription>View and manage all beta access invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invitations yet. Send your first invite to get started!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell className="capitalize">{invite.user_type}</TableCell>
                    <TableCell>{getStatusBadge(invite.status)}</TableCell>
                    <TableCell>{format(new Date(invite.invited_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {invite.accepted_at 
                        ? format(new Date(invite.accepted_at), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invite.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {invite.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(invite.id, invite.email)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BetaAccess;
