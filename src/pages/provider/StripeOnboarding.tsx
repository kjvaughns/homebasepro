import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function StripeOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'checking' | 'success' | 'incomplete' | 'not-started' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to continue',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }
      checkOnboardingStatus();
    };
    
    checkAuth();
  }, []);

  const checkOnboardingStatus = async () => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');

    if (success === 'true') {
      // User returned from successful onboarding
      try {
        // Verify authentication first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('No active session:', sessionError);
          setErrorMessage('Your session has expired. Please log in again.');
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

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
      } catch (error: any) {
        console.error('Status check error:', error);
        
        const errorData = error?.message ? JSON.parse(error.message) : {};
        
        if (errorData.code === 'AUTH_MISSING' || errorData.code === 'AUTH_INVALID') {
          setErrorMessage('Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setErrorMessage(errorData.message || 'Unable to check Stripe status');
        }
        
        setStatus('error');
      }
    } else if (refresh === 'true') {
      // User needs to refresh onboarding
      setStatus('incomplete');
    } else {
      // Just checking status
      try {
        // Verify authentication first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('No active session:', sessionError);
          setErrorMessage('Your session has expired. Please log in again.');
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

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
      } catch (error: any) {
        console.error('Status check error:', error);
        
        const errorData = error?.message ? JSON.parse(error.message) : {};
        
        if (errorData.code === 'AUTH_MISSING' || errorData.code === 'AUTH_INVALID') {
          setErrorMessage('Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setErrorMessage(errorData.message || 'Unable to check Stripe status');
        }
        
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
      <GlassCard className="max-w-md w-full p-8">
        <div className="text-center space-y-4">
          {status === 'checking' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold">Checking Status</h2>
              <p className="text-muted-foreground">Please wait while we verify your account...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <h2 className="text-2xl font-bold">All Set!</h2>
              <p className="text-muted-foreground">
                Your Stripe account is connected and ready to accept payments
              </p>
            </>
          )}

          {status === 'not-started' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h2 className="text-2xl font-bold">Stripe Connect Not Setup</h2>
              <p className="text-muted-foreground">
                You haven't started setting up Stripe Connect yet. You can do this later from Settings when you're ready to accept payments.
              </p>
            </>
          )}

          {status === 'incomplete' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-amber-600" />
              <h2 className="text-2xl font-bold">Onboarding Incomplete</h2>
              <p className="text-muted-foreground">
                You need to complete a few more steps to activate payments
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h2 className="text-2xl font-bold">Something Went Wrong</h2>
              <p className="text-muted-foreground">
                {errorMessage || 'We encountered an error checking your account status'}
              </p>
            </>
          )}
        </div>

        <div className="space-y-4 mt-6">
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
                  You can access your dashboard now and set up Stripe Connect from Settings {'>'} Payments when you're ready to accept payments from clients.
                </p>
              </div>

              <Button onClick={() => navigate('/provider/dashboard')} className="w-full" size="lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                onClick={() => navigate('/provider/settings')}
                variant="outline"
                className="w-full"
              >
                Set Up in Settings
              </Button>
            </div>
          )}

          {status === 'incomplete' && (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Complete Your Setup</h4>
                <p className="text-sm text-muted-foreground">
                  You're almost done! Click below to continue where you left off.
                </p>
              </div>

              <Button onClick={handleContinueOnboarding} className="w-full" size="lg">
                Continue Onboarding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                onClick={() => navigate('/provider/dashboard')}
                variant="outline"
                className="w-full"
              >
                Do This Later
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setStatus('checking');
                  checkOnboardingStatus();
                }}
                className="w-full"
                size="lg"
              >
                Try Again
              </Button>

              <Button
                onClick={() => navigate('/provider/settings')}
                variant="outline"
                className="w-full"
              >
                Go to Settings
              </Button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
