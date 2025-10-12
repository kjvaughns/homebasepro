import { Card, CardContent } from '@/components/ui/card';
import { Users, Gift } from 'lucide-react';

interface RoleBannerProps {
  role: 'provider' | 'homeowner';
}

export function RoleBanner({ role }: RoleBannerProps) {
  const isProvider = role === 'provider';

  return (
    <Card className={`border-2 ${isProvider ? 'border-primary/30 bg-primary/5' : 'border-accent/30 bg-accent/5'}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`p-2 sm:p-3 rounded-full ${isProvider ? 'bg-primary/20' : 'bg-accent/20'} flex-shrink-0`}>
            {isProvider ? (
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            ) : (
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base sm:text-lg">
              {isProvider ? '🔗 Your Referral Link' : '🔗 Your Referral Link'}
            </h3>
            
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isProvider ? (
                <>
                  Share your link to track progress toward <span className="text-primary font-semibold">25% off for life</span>
                </>
              ) : (
                <>
                  Share your link to track progress toward <span className="text-accent font-semibold">$50 service credits</span>
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
