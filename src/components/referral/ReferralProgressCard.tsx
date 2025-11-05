import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Gift, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';

interface ReferralProgressCardProps {
  totalReferrals: number;
  qualifiedReferrals: number;
  userRole: 'provider' | 'homeowner';
  currentTier?: string;
}

const PROVIDER_MILESTONES = [
  { count: 1, reward: '$10 Credit', icon: Gift, tier: 'signup' },
  { count: 3, reward: '1 Month Free', icon: Sparkles, tier: 'milestone_3' },
  { count: 5, reward: '25% Lifetime Discount', icon: Trophy, tier: 'milestone_5' },
  { count: 10, reward: 'Partner Status', icon: Target, tier: 'milestone_10' }
];

const HOMEOWNER_MILESTONES = [
  { count: 1, reward: '$10 Credit per Friend', icon: Gift, tier: 'signup' },
  { count: 5, reward: '$50 Bonus Credit', icon: Sparkles, tier: 'milestone_5' },
  { count: 25, reward: 'VIP Status', icon: Trophy, tier: 'milestone_25' }
];

export function ReferralProgressCard({ 
  totalReferrals, 
  qualifiedReferrals, 
  userRole,
  currentTier 
}: ReferralProgressCardProps) {
  const [justUnlocked, setJustUnlocked] = useState<number | null>(null);
  const milestones = userRole === 'provider' ? PROVIDER_MILESTONES : HOMEOWNER_MILESTONES;
  
  // Find next milestone
  const nextMilestone = milestones.find(m => qualifiedReferrals < m.count);
  const currentMilestoneIndex = milestones.findIndex(m => m.count === nextMilestone?.count);
  const previousMilestone = currentMilestoneIndex > 0 ? milestones[currentMilestoneIndex - 1] : null;
  
  const progressStart = previousMilestone?.count || 0;
  const progressEnd = nextMilestone?.count || milestones[milestones.length - 1].count;
  const progressPercent = ((qualifiedReferrals - progressStart) / (progressEnd - progressStart)) * 100;

  // Celebration effect when milestone is reached
  useEffect(() => {
    const lastMilestone = milestones.find(m => m.count === qualifiedReferrals);
    if (lastMilestone && justUnlocked !== qualifiedReferrals) {
      setJustUnlocked(qualifiedReferrals);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [qualifiedReferrals, milestones, justUnlocked]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Progress</CardTitle>
          {currentTier && (
            <Badge variant="secondary" className="font-semibold">
              {currentTier.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-primary">{totalReferrals}</div>
            <div className="text-sm text-muted-foreground">Total Referrals</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-primary">{qualifiedReferrals}</div>
            <div className="text-sm text-muted-foreground">Qualified</div>
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {nextMilestone && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Next Reward</span>
              <span className="text-muted-foreground">
                {qualifiedReferrals}/{nextMilestone.count}
              </span>
            </div>
            
            <Progress value={Math.min(progressPercent, 100)} className="h-3" />
            
            <div className="flex items-center gap-2 text-sm">
              <nextMilestone.icon className="h-4 w-4 text-primary" />
              <span className="font-semibold">{nextMilestone.reward}</span>
              {nextMilestone.count - qualifiedReferrals > 0 && (
                <span className="text-muted-foreground ml-auto">
                  {nextMilestone.count - qualifiedReferrals} more to go!
                </span>
              )}
            </div>
          </div>
        )}

        {/* All Milestones */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Milestones</div>
          <div className="space-y-2">
            {milestones.map((milestone) => {
              const isUnlocked = qualifiedReferrals >= milestone.count;
              const Icon = milestone.icon;
              
              return (
                <div
                  key={milestone.count}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isUnlocked 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-muted/30 border-transparent opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    isUnlocked ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      isUnlocked ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium">{milestone.reward}</div>
                    <div className="text-xs text-muted-foreground">
                      {milestone.count} {milestone.count === 1 ? 'referral' : 'referrals'}
                    </div>
                  </div>
                  
                  {isUnlocked && (
                    <Badge variant="default" className="text-xs">
                      Unlocked
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
