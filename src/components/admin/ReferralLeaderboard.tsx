import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Eye } from "lucide-react";
import ReferralDetailDialog from "./ReferralDetailDialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeaderboardEntry {
  referral_code: string;
  role: string;
  total_referred: number;
  eligible_referred: number;
  waitlist_id: string;
}

const ReferralLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await supabase
          .from("referral_profiles")
          .select(`
            referral_code,
            role,
            waitlist_id,
            referral_stats!inner(total_referred, eligible_referred)
          `)
          .order("referral_stats(total_referred)", { ascending: false })
          .limit(50);

        const formatted = data?.map((entry: any) => ({
          referral_code: entry.referral_code,
          role: entry.role,
          total_referred: entry.referral_stats?.total_referred || 0,
          eligible_referred: entry.referral_stats?.eligible_referred || 0,
          waitlist_id: entry.waitlist_id,
        })) || [];

        setLeaderboard(formatted);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div>Loading leaderboard...</div>;
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <>
      {/* Top 3 - Mobile: Cards, Desktop: Podium */}
      <div className="grid gap-4 md:grid-cols-3">
        {topThree.map((entry, index) => (
          <Card key={entry.referral_code} className={index === 0 ? "md:order-2" : index === 1 ? "md:order-1" : "md:order-3"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={index === 0 ? "default" : "secondary"}>
                  #{index + 1}
                </Badge>
                {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-lg truncate">{entry.referral_code}</p>
              <Badge variant="outline">{entry.role}</Badge>
              <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-xl">{entry.total_referred}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qualified</p>
                  <p className="font-bold text-xl text-primary">{entry.eligible_referred}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setSelectedProfile(entry.referral_code)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rest of leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Full Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-3">
              {rest.map((entry, index) => (
                <Card key={entry.referral_code}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 4}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{entry.referral_code}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {entry.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-bold">{entry.total_referred}</p>
                        <p className="text-xs text-primary">{entry.eligible_referred} qual.</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedProfile(entry.referral_code)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
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
                    <th className="text-left py-2 px-2">Rank</th>
                    <th className="text-left py-2 px-2">Referral Code</th>
                    <th className="text-left py-2 px-2">Role</th>
                    <th className="text-right py-2 px-2">Total Refs</th>
                    <th className="text-right py-2 px-2">Qualified</th>
                    <th className="text-right py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry, index) => (
                    <tr key={entry.referral_code} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium text-muted-foreground">
                        #{index + 4}
                      </td>
                      <td className="py-2 px-2 font-medium">{entry.referral_code}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline">{entry.role}</Badge>
                      </td>
                      <td className="text-right py-2 px-2 font-bold">
                        {entry.total_referred}
                      </td>
                      <td className="text-right py-2 px-2 font-bold text-primary">
                        {entry.eligible_referred}
                      </td>
                      <td className="text-right py-2 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProfile(entry.referral_code)}
                        >
                          <Eye className="h-4 w-4" />
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

      {selectedProfile && (
        <ReferralDetailDialog
          referralCode={selectedProfile}
          open={!!selectedProfile}
          onOpenChange={(open) => !open && setSelectedProfile(null)}
        />
      )}
    </>
  );
};

export default ReferralLeaderboard;
