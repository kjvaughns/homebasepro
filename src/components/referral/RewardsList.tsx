import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Percent, Gift } from 'lucide-react';
import { format } from 'date-fns';

interface RewardsListProps {
  profileId: string;
}

export function RewardsList({ profileId }: RewardsListProps) {
  const { data: rewards, isLoading } = useQuery({
    queryKey: ['rewards', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards_ledger')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profileId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rewards History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!rewards || rewards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rewards History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Gift className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No rewards yet — invite friends to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rewards History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rewards.map((reward) => {
            const isDiscount = reward.reward_type === 'provider_discount';
            const icon = isDiscount ? Percent : DollarSign;
            const Icon = icon;

            return (
              <div
                key={reward.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isDiscount ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <Icon className={`h-4 w-4 ${isDiscount ? 'text-blue-600' : 'text-green-600'}`} />
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm">
                      {isDiscount ? (
                        `${(reward.meta as any)?.percent || 0}% Lifetime Discount`
                      ) : (
                        `$${reward.amount} Service Credit`
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(reward.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <Badge variant={isDiscount ? 'secondary' : 'default'}>
                  {isDiscount ? 'Discount' : 'Credit'}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
