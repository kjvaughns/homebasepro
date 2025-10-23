import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function StripeOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'checking' | 'success' | 'incomplete' | 'not-started' | 'error'>('checking');

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');

    if (success === 'true') {
      // User returned from successful onboarding
      try {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
          body: { action: 'check-status' },
        });

        if (error) {
          console.error('Stripe Connect check-status error:', error);
          throw error;
        }

        console.log('Stripe Connect status:', data);

        if (data.connected === false) {
          setStatus('not-started');
        } else if (data.complete) {
          setStatus('success');
          toast({
            title: 'Stripe Connected!',
            description: 'Your account is ready to accept payments',
          });
        } else {
          setStatus('incomplete');
        }
      } catch (error) {
        console.error('Status check error:', error);
        setStatus('error');
      }
    } else if (refresh === 'true') {
      // User needs to refresh onboarding
      setStatus('incomplete');
    } else {
      // Just checking status
      try {
        const { data, error } = await supabase.functions.invoke('stripe-connect', {
          body: { action: 'check-status' },
        });

        if (error) {
          console.error('Stripe Connect check-status error:', error);
          throw error;
        }

        console.log('Stripe Connect status:', data);

        if (data.connected === false) {
          setStatus('not-started');
        } else {
          setStatus(data.complete ? 'success' : 'incomplete');
        }
      } catch (error) {
        console.error('Status check error:', error);
        setStatus('error');
      }
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account-link' },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create onboarding link',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'checking' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <CardTitle>Checking Status</CardTitle>
              <CardDescription>Please wait while we verify your account...</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <CardTitle>All Set!</CardTitle>
              <CardDescription>
                Your Stripe account is connected and ready to accept payments
              </CardDescription>
            </>
          )}

          {status === 'not-started' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Stripe Connect Not Setup</CardTitle>
              <CardDescription>
                You haven't started setting up Stripe Connect yet. You can do this later from Settings when you're ready to accept payments.
              </CardDescription>
            </>
          )}

          {status === 'incomplete' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-amber-600" />
              <CardTitle>Onboarding Incomplete</CardTitle>
              <CardDescription>
                You need to complete a few more steps to activate payments
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <CardTitle>Something Went Wrong</CardTitle>
              <CardDescription>
                We encountered an error checking your account status
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">What's Next?</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Create payment links and invoices</li>
                  <li>• Accept payments from clients</li>
                  <li>• View your balance and request payouts</li>
                </ul>
              </div>

              <Button onClick={() => navigate('/provider/settings')} className="w-full" size="lg">
                Go to Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                onClick={() => navigate('/provider/dashboard')}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'not-started' && (
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Set Up Payments Later</h4>
                <p className="text-sm text-muted-foreground">
                  You can access your dashboard now and set up Stripe Connect from Settings {'>'}Payments when you're ready to accept payments from clients.
                </p>
              </div>

              <Button onClick={() => navigate('/provider/dashboard')} className="w-full" size="lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button onClick={() => navigate('/provider/settings?tab=payments')} variant="outline" className="w-full">
                Set Up Stripe Connect Now
              </Button>
            </div>
          )}

          {status === 'incomplete' && (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Required Information</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Business details</li>
                  <li>• Bank account information</li>
                  <li>• Identity verification</li>
                </ul>
              </div>

              <Button onClick={handleContinueOnboarding} className="w-full" size="lg">
                Continue Onboarding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button onClick={() => navigate('/provider/settings')} variant="outline" className="w-full">
                Back to Settings
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button onClick={checkOnboardingStatus} variant="outline" className="w-full">
                Try Again
              </Button>

              <Button onClick={() => navigate('/provider/settings')} variant="ghost" className="w-full">
                Back to Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
