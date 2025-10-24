import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Sparkles } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PWAOnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
}

export function PWAOnboardingFlow({ open, onComplete }: PWAOnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'notifications' | 'complete'>('welcome');
  const { subscribe, loading } = usePushNotifications();

  const handleEnableNotifications = async () => {
    console.log('📱 PWA Onboarding: User clicked "Enable Notifications"');
    const success = await subscribe();
    console.log('📱 PWA Onboarding: Subscription result:', success);
    if (success) {
      console.log('📱 PWA Onboarding: Moving to complete step');
      setStep('complete');
    } else {
      console.warn('📱 PWA Onboarding: Subscription failed, staying on notifications step');
    }
  };

  const handleSkip = () => {
    setStep('complete');
  };

  const handleFinish = () => {
    // Mark onboarding as complete
    localStorage.setItem('pwa_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        {step === 'welcome' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Welcome to HomeBase!</DialogTitle>
              <DialogDescription className="text-center">
                Thanks for installing HomeBase. Let's get you set up with the best experience.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setStep('notifications')} className="w-full">
                Get Started
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'notifications' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Stay Updated</DialogTitle>
              <DialogDescription className="text-center">
                Enable push notifications to receive important updates about your appointments, messages, and services.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Appointment Reminders</p>
                  <p className="text-xs text-muted-foreground">Never miss a scheduled service</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">New Messages</p>
                  <p className="text-xs text-muted-foreground">Get notified when providers respond</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Service Updates</p>
                  <p className="text-xs text-muted-foreground">Stay informed about your home maintenance</p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button 
                onClick={handleEnableNotifications} 
                disabled={loading}
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
              <Button 
                onClick={handleSkip} 
                variant="ghost"
                className="w-full"
              >
                Skip for now
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'complete' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">All Set!</DialogTitle>
              <DialogDescription className="text-center">
                You're ready to start using HomeBase. You can change notification settings anytime in your account settings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={handleFinish} className="w-full">
                Continue to HomeBase
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
