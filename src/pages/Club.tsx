import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Home } from "lucide-react";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { ReferralProgressCard } from "@/components/referral/ReferralProgressCard";
import { ReferralStatsGrid } from "@/components/referral/ReferralStatsGrid";
import { ReferredUsersList } from "@/components/referral/ReferredUsersList";
import { ReferralAchievements } from "@/components/referral/ReferralAchievements";
import { EnhancedShareButtons } from "@/components/referral/EnhancedShareButtons";
import { RewardsList } from "@/components/referral/RewardsList";
import { AntiFraudNotice } from "@/components/referral/AntiFraudNotice";
import { RoleBanner } from "@/components/referral/RoleBanner";
import { toast } from "sonner";

const ClubPortal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Load referral code from user profile, URL, or storage
  useEffect(() => {
    const loadReferralCode = async () => {
      // Try URL first
      const urlCode = searchParams.get('ref');
      if (urlCode) {
        setReferralCode(urlCode);
        return;
      }

      // Try user's own code
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('referral_profiles')
          .select('referral_code')
          .eq('user_id', user.id)
          .single();

        if (profile?.referral_code) {
          setReferralCode(profile.referral_code);
          return;
        }
      }

      // Try localStorage
      const stored = localStorage.getItem('homebase_referral_code');
      if (stored) {
        setReferralCode(stored);
        return;
      }

      // Show manual input
      setShowManualInput(true);
    };

    loadReferralCode();
  }, [searchParams]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      setReferralCode(manualCode.trim());
      localStorage.setItem('homebase_referral_code', manualCode.trim());
      setShowManualInput(false);
    }
  };

  // Fetch user profile and referral data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['referral-profile', referralCode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, referral_profiles!inner(*)')
        .eq('user_id', user.id)
        .single();

      return profile;
    },
    enabled: !!referralCode
  });

  // Fetch referral stats
  const { data: stats } = useQuery({
    queryKey: ['referral-stats', referralCode],
    queryFn: async () => {
      const { data } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('referrer_code', referralCode)
        .single();

      return data;
    },
    enabled: !!referralCode
  });

  // Fetch referred users
  const { data: referredUsers } = useQuery({
    queryKey: ['referred-users', referralCode],
    queryFn: async () => {
      const { data } = await supabase
        .from('referral_events')
        .select(`
          id,
          created_at,
          referred_profile:referral_profiles!referral_events_referred_profile_id_fkey(
            referral_code,
            role
          )
        `)
        .eq('referrer_code', referralCode)
        .order('created_at', { ascending: false });

      return data?.map(event => ({
        id: event.id,
        referralCode: event.referred_profile?.referral_code || 'Unknown',
        createdAt: event.created_at,
        role: event.referred_profile?.role || 'homeowner',
        status: Math.random() > 0.5 ? 'qualified' as const : 'pending' as const,
        rewardValue: 10
      })) || [];
    },
    enabled: !!referralCode
  });

  // Fetch rewards
  const { data: rewards } = useQuery({
    queryKey: ['rewards', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data } = await supabase
        .from('rewards_ledger')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      return data || [];
    },
    enabled: !!profile?.id
  });

  const handleHomeClick = () => {
    if (!profile) {
      navigate('/login');
      return;
    }

    const userType = profile.user_type;
    if (userType === 'provider') {
      navigate('/provider/dashboard');
    } else if (userType === 'homeowner') {
      navigate('/homeowner/dashboard');
    } else {
      navigate('/');
    }
  };

  // Show manual code entry if needed
  if (showManualInput) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Enter Referral Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your HomeBase referral code to access the Club Portal
              </p>
              <Input
                placeholder="Enter code..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your referral dashboard...</p>
        </div>
      </div>
    );
  }

  const totalReferred = stats?.total_referred || 0;
  const totalEligible = stats?.eligible_referred || 0;
  const pendingReferrals = totalReferred - totalEligible;
  const totalEarned = (rewards?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0) / 100;
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  const userRole = (profile?.user_type as 'provider' | 'homeowner') || 'homeowner';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">HomeBase Club</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Share, Earn, Grow Together
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHomeClick}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">
        {/* Welcome Banner */}
        <RoleBanner role={userRole as 'provider' | 'homeowner'} />

        {/* Stats Grid */}
        <ReferralStatsGrid
          totalReferred={totalReferred}
          qualified={totalEligible}
          pending={pendingReferrals}
          totalEarned={totalEarned}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress & Referrals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <ReferralProgressCard
              totalReferrals={totalReferred}
              qualifiedReferrals={totalEligible}
              userRole={userRole as 'provider' | 'homeowner'}
            />

            {/* Referred Users List */}
            <ReferredUsersList users={referredUsers || []} />

            {/* Achievements */}
            <ReferralAchievements />

            {/* Rewards History */}
            {profile?.id && <RewardsList profileId={profile.id} />}
          </div>

          {/* Right Column - Share & Info */}
          <div className="space-y-6">
            {/* Referral Code Card */}
            <ReferralCard referralLink={referralLink} />

            {/* Enhanced Share Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Your Link</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedShareButtons
                  referralLink={referralLink}
                  userRole={userRole as 'provider' | 'homeowner'}
                  userName={profile?.full_name}
                />
              </CardContent>
            </Card>

            {/* Anti-Fraud Notice */}
            <AntiFraudNotice />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubPortal;
