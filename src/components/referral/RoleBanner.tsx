import { Card, CardContent } from '@/components/ui/card';
import { Users, Gift } from 'lucide-react';

interface RoleBannerProps {
  role: 'provider' | 'homeowner';
}

export function RoleBanner({ role }: RoleBannerProps) {
  const isProvider = role === 'provider';

  return (
    <Card className={`border-2 ${isProvider ? 'border-blue-200 bg-blue-50/50' : 'border-green-200 bg-green-50/50'}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isProvider ? 'bg-blue-100' : 'bg-green-100'}`}>
            {isProvider ? (
              <Users className="h-6 w-6 text-blue-600" />
            ) : (
              <Gift className="h-6 w-6 text-green-600" />
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">
              {isProvider ? 'Provider Rewards' : 'Homeowner Rewards'}
            </h3>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isProvider ? (
                <>
                  <strong>Invite 5 homeowners</strong> to unlock your{' '}
                  <span className="text-blue-600 font-semibold">25% lifetime discount</span> during beta.
                  <br />
                  <span className="text-xs">After launch, new referrals earn 10% discount.</span>
                </>
              ) : (
                <>
                  <strong>Invite friends</strong> — every{' '}
                  <span className="text-green-600 font-semibold">5 who join and purchase</span> earns you{' '}
                  <span className="text-green-600 font-semibold">$50</span> in HomeBase service credits.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
