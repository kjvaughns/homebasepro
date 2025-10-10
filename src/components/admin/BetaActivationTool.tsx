import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface WaitlistUser {
  id: string;
  email: string;
  full_name: string;
  account_type: string;
  created_at: string;
  referral_code?: string;
  has_beta_access: boolean;
}

const BetaActivationTool = () => {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activating, setActivating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchWaitlistUsers = async () => {
    try {
      // Get waitlist users with referral info
      const { data: waitlistData } = await supabase
        .from("waitlist")
        .select(`
          id,
          email,
          full_name,
          account_type,
          created_at,
          referral_profiles(referral_code)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!waitlistData) return;

      // Check which ones already have beta access
      const { data: betaData } = await supabase
        .from("beta_access")
        .select("email")
        .in(
          "email",
          waitlistData.map((u) => u.email)
        );

      const betaEmails = new Set(betaData?.map((b) => b.email) || []);

      const formatted = waitlistData.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        account_type: user.account_type,
        created_at: user.created_at,
        referral_code: user.referral_profiles?.referral_code,
        has_beta_access: betaEmails.has(user.email),
      }));

      // Filter to only show users without beta access (referral-only unless showAll)
      setUsers(
        formatted.filter((u) => !u.has_beta_access && (showAll ? true : !!u.referral_code))
      );
    } catch (error) {
      console.error("Error fetching waitlist users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlistUsers();
  }, [showAll]);

  const toggleSelection = (userId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const activateSelected = async () => {
    if (selected.size === 0) return;

    setActivating(true);
    try {
      const selectedUsers = users.filter((u) => selected.has(u.id));

      // Insert beta access for selected users
      const { error } = await supabase.from("beta_access").insert(
        selectedUsers.map((user) => ({
          email: user.email,
          user_type: user.account_type,
          status: "pending",
          notes: `Auto-activated from referral (${user.referral_code})`,
        }))
      );

      if (error) throw error;

      toast({
        title: "Beta Access Granted",
        description: `${selected.size} users activated for beta access`,
      });

      setSelected(new Set());
      await fetchWaitlistUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return <div>Loading waitlist users...</div>;
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No referred waitlist users pending beta activation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base md:text-lg">
            Waitlist Users ({users.length})
          </CardTitle>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <Label htmlFor="show-all" className="text-xs md:text-sm text-muted-foreground">Show all</Label>
              <Switch id="show-all" checked={showAll} onCheckedChange={(v) => setShowAll(Boolean(v))} />
            </div>
            <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selected.size === users.length ? "Deselect All" : "Select All"}
            </Button>
            <Button
              size="sm"
              onClick={activateSelected}
              disabled={selected.size === 0 || activating}
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate ({selected.size})
                </>
              )}
            </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(user.id)}
                      onCheckedChange={() => toggleSelection(user.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="font-medium truncate">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{user.account_type}</Badge>
                        <Badge>Ref: {user.referral_code}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 w-8">
                    <Checkbox
                      checked={selected.size === users.length}
                      onCheckedChange={selectAll}
                    />
                  </th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Referred By</th>
                  <th className="text-left py-2 px-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">
                      <Checkbox
                        checked={selected.has(user.id)}
                        onCheckedChange={() => toggleSelection(user.id)}
                      />
                    </td>
                    <td className="py-2 px-2 font-medium">{user.full_name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{user.email}</td>
                    <td className="py-2 px-2">
                      <Badge variant="outline">{user.account_type}</Badge>
                    </td>
                    <td className="py-2 px-2">
                      <Badge>{user.referral_code}</Badge>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BetaActivationTool;
