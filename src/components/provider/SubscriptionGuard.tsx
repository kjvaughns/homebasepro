import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CreditCard } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredFeature?: string;
}

export function SubscriptionGuard({ children, requiredFeature }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, trial_ends_at, stripe_subscription_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Allow if on paid plan
      if (profile.plan && profile.plan !== 'free') {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Allow if within trial period
      if (profile.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();
        if (now < trialEnd) {
          setHasAccess(true);
          setLoading(false);
          return;
        }
      }

      // Block if no active subscription and trial expired
      setHasAccess(false);
    } catch (error) {
      console.error('Access check error:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Subscription Required</CardTitle>
            <CardDescription>
              {requiredFeature 
                ? `This feature requires an active subscription. Upgrade to continue using ${requiredFeature}.`
                : 'Start your 14-day free trial to access all business features.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">BETA Launch Special</p>
              <p className="text-muted-foreground">
                • $15/month (normally $29)<br />
                • 14-day free trial<br />
                • 3% transaction fees<br />
                • Unlimited clients<br />
                • Cancel anytime
              </p>
            </div>
            <Button 
              onClick={() => navigate('/provider/settings?tab=billing')} 
              className="w-full"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Start Free Trial
            </Button>
            <Button 
              onClick={() => navigate('/provider/dashboard')} 
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
