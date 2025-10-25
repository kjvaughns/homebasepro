import { useState, useEffect } from 'react';
import { Smartphone, Bell, Download, CheckCircle, XCircle, AlertCircle, Bug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { InstallPromptDialog } from './InstallPromptDialog';
import { PushPermissionDialog } from './PushPermissionDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function PWASettingsCard() {
  const { canInstall, isInstalled, isIOS, promptInstall, dismissInstall } = usePWAInstall();
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [vapidAvailable, setVapidAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if VAPID keys are configured
  useEffect(() => {
    const checkVapid = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-vapid-public-key');
        setVapidAvailable(!!data?.publicKey);
      } catch {
        setVapidAvailable(false);
      }
    };
    checkVapid();
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowInstallDialog(true);
    } else {
      const success = await promptInstall();
      if (success) {
        toast({
          title: 'HomeBase installed!',
          description: 'You can now access HomeBase from your home screen'
        });
      }
    }
  };

  const handleEnablePush = async () => {
    if (isIOS && !isInstalled) {
      toast({
        title: 'Install required',
        description: 'Please install HomeBase first to enable notifications on iOS',
        variant: 'destructive'
      });
      return;
    }
    setSaving(true);
    toast({
      title: 'Saving device...',
      description: 'Registering this device for notifications'
    });
    
    const success = await subscribe();
    setSaving(false);
    
    if (success) {
      toast({
        title: 'Device saved',
        description: 'Push notifications are now enabled'
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      console.log('📤 Sending test notification...');
      
      // Get current session to ensure we have auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Notification',
          body: 'This is a test notification from HomeBase!',
          url: '/provider/dashboard'
        }
      });

      if (error) {
        console.error('❌ Test notification error:', error);
        throw error;
      }

      console.log('✅ Test notification response:', data);
      
      // Check if no subscriptions found
      if (data?.message === 'No subscriptions found') {
        toast({
          title: 'No subscriptions found',
          description: 'No subscriptions found for this account on this device. Please enable notifications on this device, or toggle them off and on again.',
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: 'Test notification sent',
        description: data?.sent > 0 ? `Sent to ${data.sent} device(s)` : 'You should receive it shortly'
      });
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      toast({
        title: 'Failed to send test',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Denied</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Not set</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Progressive Web App
          </CardTitle>
          <CardDescription>
            Install HomeBase for quick access and offline support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Install Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Installation Status</p>
                <p className="text-xs text-muted-foreground">
                  {isInstalled 
                    ? 'HomeBase is installed on this device' 
                    : 'Install HomeBase for the best experience'}
                </p>
              </div>
              {isInstalled ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" /> Installed
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Download className="h-3 w-3" /> Not installed
                </Badge>
              )}
            </div>

            {!isInstalled && canInstall && (
              <Button onClick={handleInstall} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Install HomeBase
              </Button>
            )}
          </div>

          {vapidAvailable && (
            <>
              <Separator />

              {/* Push Notifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Push Notifications
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Receive updates about your services
                    </p>
                  </div>
                  {getPermissionBadge()}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subscription status:</span>
                  {isSubscribed ? (
                    <span className="font-medium text-primary">Active</span>
                  ) : (
                    <span className="font-medium">Not subscribed</span>
                  )}
                </div>

                {isIOS && !isInstalled && (
                  <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">iOS Note:</p>
                    Push notifications work only when HomeBase is installed to your home screen.
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {!isSubscribed ? (
                      <Button 
                        onClick={handleEnablePush} 
                        disabled={loading || saving}
                        className="flex-1"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Enable Notifications
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={unsubscribe} 
                          disabled={loading}
                          variant="outline"
                          className="flex-1"
                        >
                          Disable Notifications
                        </Button>
                        {import.meta.env.DEV && (
                          <Button 
                            onClick={handleTestNotification}
                            variant="secondary"
                            size="sm"
                          >
                            Test
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {import.meta.env.DEV && (
                    <Button 
                      onClick={() => navigate('/debug/pwa')}
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      Debug Panel
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <InstallPromptDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
        isIOS={isIOS}
        onInstall={handleInstall}
        onDismiss={dismissInstall}
      />

      <PushPermissionDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        onEnable={subscribe}
        isIOS={isIOS}
        isInstalled={isInstalled}
      />
    </>
  );
}
