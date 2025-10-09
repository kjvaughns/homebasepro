import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReferralCard } from '@/components/referral/ReferralCard';
import { ProgressBar } from '@/components/referral/ProgressBar';
import { RoleBanner } from '@/components/referral/RoleBanner';
import { RewardsList } from '@/components/referral/RewardsList';
import { AntiFraudNotice } from '@/components/referral/AntiFraudNotice';
import { ShareButtons } from '@/components/referral/ShareButtons';
import { Loader2, Home, Users, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function ClubPortal() {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Load referral code from localStorage or fetch from DB
  useEffect(() => {
    const storedCode = localStorage.getItem('homebase_referral_code');
    if (storedCode) {
      setReferralCode(storedCode);
    }
  }, []);

  // Fetch user's referral profile and stats
  const { data: profile, isLoading } = useQuery({
    queryKey: ['referral-profile', referralCode],
    queryFn: async () => {
      if (!referralCode) return null;

      const { data, error } = await supabase
        .from('referral_profiles')
        .select('*, waitlist!inner(*)')
        .eq('referral_code', referralCode)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!referralCode
  });

  const { data: stats } = useQuery({
    queryKey: ['referral-stats', referralCode],
    queryFn: async () => {
      if (!referralCode) return null;

      const { data, error } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('referrer_code', referralCode)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { total_referred: 0, eligible_referred: 0 };
    },
    enabled: !!referralCode
  });

  if (!referralCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              No referral code found. Please join the waitlist first.
            </p>
            <Button onClick={() => navigate('/waitlist')}>
              Join Waitlist
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Profile not found. Please contact support.
            </p>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/waitlist?ref=${referralCode}`;
  const isProvider = profile.role === 'provider';
  const totalReferred = stats?.total_referred || 0;
  const eligibleReferred = stats?.eligible_referred || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-xl">HomeBase Club</h1>
                <p className="text-sm text-muted-foreground">Member Portal</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">
              Welcome back, {profile.waitlist.full_name?.split(' ')[0]}!
            </h2>
            <p className="text-muted-foreground">
              Track your referrals and claim your rewards
            </p>
          </div>

          {/* Role Banner */}
          <RoleBanner role={profile.role as 'provider' | 'homeowner'} />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Referred
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <p className="text-3xl font-bold">{totalReferred}</p>
                </div>
              </CardContent>
            </Card>

            {!isProvider && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Eligible (Purchased)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    <p className="text-3xl font-bold">{eligibleReferred}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Next Milestone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{5 - (totalReferred % 5)}</span>
                  <span className="text-sm text-muted-foreground">more to go</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProgressBar 
                current={totalReferred} 
                target={5} 
                label={isProvider ? "Referrals to discount" : "Referrals"} 
              />
              
              {!isProvider && (
                <ProgressBar 
                  current={eligibleReferred} 
                  target={5} 
                  label="Qualified purchases to next $50 credit" 
                />
              )}

              {totalReferred >= 5 && (
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="font-semibold text-primary">
                    🎉 Milestone Reached! {isProvider ? 'Discount unlocked!' : 'Keep going for more credits!'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Card */}
          <ReferralCard referralLink={referralLink} />

          {/* Share Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Share Your Link</CardTitle>
            </CardHeader>
            <CardContent>
              <ShareButtons 
                referralLink={referralLink}
                shareText={`Join me on HomeBase and ${isProvider ? 'grow your business' : 'get amazing home services'}!`}
              />
            </CardContent>
          </Card>

          {/* Rewards List */}
          <RewardsList profileId={profile.id} />

          {/* Guidelines */}
          <AntiFraudNotice />
        </div>
      </main>
    </div>
  );
}
