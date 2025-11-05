import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Star, Crown } from 'lucide-react';
import { format } from 'date-fns';

const ACHIEVEMENT_DEFINITIONS = {
  first_steps: {
    icon: Star,
    title: 'First Steps',
    description: 'Made your first referral',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  building_community: {
    icon: Award,
    title: 'Building Community',
    description: '5 successful referrals',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  growth_champion: {
    icon: Trophy,
    title: 'Growth Champion',
    description: '10 successful referrals',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  homebase_ambassador: {
    icon: Crown,
    title: 'HomeBase Ambassador',
    description: '25+ successful referrals',
    color: 'text-primary',
    bgColor: 'bg-primary/5'
  }
};

export function ReferralAchievements() {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['referral-achievements'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('referral_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading || !achievements || achievements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((achievement) => {
            const def = ACHIEVEMENT_DEFINITIONS[achievement.achievement_type as keyof typeof ACHIEVEMENT_DEFINITIONS];
            if (!def) return null;

            const Icon = def.icon;

            return (
              <div
                key={achievement.id}
                className="flex flex-col items-center text-center p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className={`p-3 rounded-full ${def.bgColor} mb-2`}>
                  <Icon className={`h-6 w-6 ${def.color}`} />
                </div>
                <div className="text-sm font-semibold mb-1">{def.title}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {def.description}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {format(new Date(achievement.unlocked_at), 'MMM yyyy')}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
