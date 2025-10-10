import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

interface ReferralDetailDialogProps {
  referralCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReferralDetailDialog = ({
  referralCode,
  open,
  onOpenChange,
}: ReferralDetailDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !referralCode) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Get profile
        const { data: profileData } = await supabase
          .from("referral_profiles")
          .select(`
            *,
            referral_stats(*)
          `)
          .eq("referral_code", referralCode)
          .single();

        setProfile(profileData);

        // Get referrals made by this user
        const { data: referralsData } = await supabase
          .from("referral_events")
          .select(`
            *,
            referral_profiles!referred_profile_id(referral_code, role)
          `)
          .eq("referrer_code", referralCode)
          .order("created_at", { ascending: false });

        setReferrals(referralsData || []);

        // Get rewards issued
        const { data: rewardsData } = await supabase
          .from("rewards_ledger")
          .select("*")
          .eq("profile_id", profileData?.id)
          .order("created_at", { ascending: false });

        setRewards(rewardsData || []);
      } catch (error) {
        console.error("Error fetching referral details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [referralCode, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Referral Profile Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Info */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{referralCode}</span>
                  <Badge>{profile?.role}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Referrals</p>
                    <p className="font-bold text-xl">
                      {profile?.referral_stats?.total_referred || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Qualified</p>
                    <p className="font-bold text-xl text-primary">
                      {profile?.referral_stats?.eligible_referred || 0}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    Joined: {new Date(profile?.created_at).toLocaleDateString()}
                  </p>
                  {profile?.referred_by_code && (
                    <p className="text-muted-foreground">
                      Referred by: <Badge variant="outline">{profile.referred_by_code}</Badge>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rewards */}
            {rewards.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Rewards Issued</h3>
                  <div className="space-y-2">
                    {rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {reward.reward_type === "service_credit"
                              ? "Service Credit"
                              : "Provider Discount"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reward.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={reward.status === "issued" ? "default" : "secondary"}>
                            {reward.status}
                          </Badge>
                          <p className="text-xs mt-1 font-semibold">
                            ${((reward.amount || 0) / 100).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Referrals List */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">
                  Referrals Made ({referrals.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {referral.referral_profiles?.referral_code || "Unknown"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {referral.referral_profiles?.role}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {referrals.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No referrals yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDetailDialog;
