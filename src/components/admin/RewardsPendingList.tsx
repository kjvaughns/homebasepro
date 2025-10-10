import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface PendingReward {
  profile_id: string;
  referral_code: string;
  role: string;
  eligible_referred: number;
  credits_owed: number;
  milestone: number;
}

const RewardsPendingList = () => {
  const [pending, setPending] = useState<PendingReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchPending = async () => {
    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from("referral_profiles")
        .select("id, referral_code, role");

      if (!profiles) return;

      // Get stats separately for each profile
      const { data: allStats } = await supabase
        .from("referral_stats")
        .select("referrer_code, eligible_referred");

      // Build stats map
      const statsMap = new Map(allStats?.map(s => [s.referrer_code, s.eligible_referred]) || []);

      // For each profile, check if they're owed credits
      const pendingList: PendingReward[] = [];

      for (const profile of profiles) {
        const eligibleCount = statsMap.get(profile.referral_code) || 0;
        
        // Only homeowners get credits
        if (profile.role !== "homeowner" || eligibleCount < 5) continue;

        // Calculate milestones reached (every 5)
        const milestonesReached = Math.floor(eligibleCount / 5);

        // Count credits already issued
        const { count: creditsIssued } = await supabase
          .from("rewards_ledger")
          .select("id", { count: "exact" })
          .eq("profile_id", profile.id)
          .eq("reward_type", "service_credit");

        const creditsOwed = milestonesReached - (creditsIssued || 0);

        if (creditsOwed > 0) {
          pendingList.push({
            profile_id: profile.id,
            referral_code: profile.referral_code,
            role: profile.role,
            eligible_referred: eligibleCount,
            credits_owed: creditsOwed,
            milestone: milestonesReached * 5,
          });
        }
      }

      setPending(pendingList);
    } catch (error) {
      console.error("Error fetching pending rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const issueReward = async (profileId: string, creditsOwed: number, referralCode: string) => {
    setIssuing(profileId);
    try {
      const { data, error } = await supabase.functions.invoke("issue-referral-reward", {
        body: {
          profile_id: profileId,
          credits_to_issue: creditsOwed,
        },
      });

      if (error) throw error;

      toast({
        title: "Reward Issued",
        description: `$${creditsOwed * 50} in service credits issued to ${referralCode}`,
      });

      // Refresh list
      await fetchPending();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIssuing(null);
    }
  };

  if (loading) {
    return <div>Loading pending rewards...</div>;
  }

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pending rewards to issue</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">
          Pending Rewards ({pending.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <div className="space-y-3">
            {pending.map((reward) => (
              <Card key={reward.profile_id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{reward.referral_code}</p>
                      <Badge variant="outline" className="mt-1">
                        {reward.role}
                      </Badge>
                    </div>
                    <Badge className="text-lg px-3 py-1">
                      ${reward.credits_owed * 50}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Milestone: {reward.milestone} qualified referrals</p>
                    <p>Credits owed: {reward.credits_owed} x $50</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      issueReward(reward.profile_id, reward.credits_owed, reward.referral_code)
                    }
                    disabled={issuing === reward.profile_id}
                  >
                    {issuing === reward.profile_id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Issuing...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Issue ${reward.credits_owed * 50}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Referral Code</th>
                  <th className="text-left py-2 px-2">Role</th>
                  <th className="text-right py-2 px-2">Milestone</th>
                  <th className="text-right py-2 px-2">Credits Owed</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-right py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((reward) => (
                  <tr key={reward.profile_id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{reward.referral_code}</td>
                    <td className="py-2 px-2">
                      <Badge variant="outline">{reward.role}</Badge>
                    </td>
                    <td className="text-right py-2 px-2">{reward.milestone}</td>
                    <td className="text-right py-2 px-2 font-bold">
                      {reward.credits_owed}
                    </td>
                    <td className="text-right py-2 px-2 font-bold text-primary">
                      ${reward.credits_owed * 50}
                    </td>
                    <td className="text-right py-2 px-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          issueReward(reward.profile_id, reward.credits_owed, reward.referral_code)
                        }
                        disabled={issuing === reward.profile_id}
                      >
                        {issuing === reward.profile_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Issue"
                        )}
                      </Button>
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

export default RewardsPendingList;
