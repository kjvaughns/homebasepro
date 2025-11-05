import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface ReferralStatsGridProps {
  totalReferred: number;
  qualified: number;
  pending: number;
  totalEarned: number;
}

export function ReferralStatsGrid({ 
  totalReferred, 
  qualified, 
  pending, 
  totalEarned 
}: ReferralStatsGridProps) {
  const stats = [
    {
      label: 'Total Referrals',
      value: totalReferred,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Qualified',
      value: qualified,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      label: 'Total Earned',
      value: `$${totalEarned}`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/5'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
