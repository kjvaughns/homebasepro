import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Bell, Database, Smartphone, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface SubscriptionInfo {
  id: string;
  endpoint: string;
  created_at: string;
  user_agent: string;
}

export default function PushDebug() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  
  const [user, setUser] = useState<any>(null);
  const [swStatus, setSwStatus] = useState<string>('checking...');
  const [browserSub, setBrowserSub] = useState<PushSubscription | null>(null);
  const [backendSubs, setBackendSubs] = useState<SubscriptionInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    
    // Get user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const active = registration.active;
        setSwStatus(active ? `Active: ${active.scriptURL}` : 'No active worker');
        
        // Get browser subscription
        const sub = await registration.pushManager.getSubscription();
        setBrowserSub(sub);
      } catch (error) {
        setSwStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
      }
    } else {
      setSwStatus('Not supported');
    }

    // Get backend subscriptions
    if (currentUser) {
      try {
        const { data } = await supabase.functions.invoke('get-my-push-subscriptions');
        setBackendSubs(data?.subscriptions || []);
      } catch (error) {
        console.error('Failed to fetch backend subs:', error);
      }
    }

    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveToBackend = async () => {
    if (!browserSub) {
      toast({
        title: 'No browser subscription',
        description: 'Subscribe first using the button above',
        variant: 'destructive'
      });
      return;
    }

    try {
      const p256dhKey = browserSub.getKey('p256dh');
      const authKey = browserSub.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const { error } = await supabase.functions.invoke('subscribe-push', {
        body: {
          endpoint: browserSub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
            auth: btoa(String.fromCharCode(...new Uint8Array(authKey)))
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Saved to backend',
        description: 'Subscription saved successfully'
      });
      
      loadData(); // Refresh
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: '🧪 Debug Test',
          body: 'This is a test notification from the debug panel',
          url: '/debug/pwa'
        }
      });

      if (error) throw error;

      toast({
        title: 'Test sent',
        description: data?.sent > 0 ? `Sent to ${data.sent} device(s)` : data?.message || 'Check console for details'
      });
    } catch (error) {
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Push Notifications Debug</h1>
          <p className="text-sm text-muted-foreground">Diagnose push notification issues</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing} className="ml-auto">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">User ID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{user?.id || 'Not authenticated'}</code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{user?.email || 'N/A'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Browser Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Browser Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Permission:</span>
            <Badge variant={permission === 'granted' ? 'default' : permission === 'denied' ? 'destructive' : 'secondary'}>
              {permission}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subscribed:</span>
            <Badge variant={isSubscribed ? 'default' : 'secondary'}>
              {isSubscribed ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Worker:</span>
            <span className="text-xs font-mono">{swStatus}</span>
          </div>
          
          {browserSub && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Browser Subscription:</p>
                <div className="bg-muted p-3 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <span className="font-mono">...{browserSub.endpoint.slice(-20)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">p256dh length:</span>
                    <span>{browserSub.getKey('p256dh')?.byteLength || 0} bytes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">auth length:</span>
                    <span>{browserSub.getKey('auth')?.byteLength || 0} bytes</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backend Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backend Subscriptions
          </CardTitle>
          <CardDescription>
            Subscriptions saved in the database for this account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Count:</span>
            <Badge>{backendSubs.length}</Badge>
          </div>
          
          {backendSubs.length > 0 ? (
            <div className="space-y-2">
              {backendSubs.map((sub) => (
                <div key={sub.id} className="bg-muted p-3 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <span className="font-mono">...{sub.endpoint.slice(-20)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(sub.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User Agent:</span>
                    <span className="truncate max-w-[200px]">{sub.user_agent || 'Unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No subscriptions found in backend</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isSubscribed ? (
            <Button onClick={subscribe} disabled={loading} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Subscribe
            </Button>
          ) : (
            <Button onClick={unsubscribe} disabled={loading} variant="outline" className="w-full">
              Unsubscribe
            </Button>
          )}
          
          <Button 
            onClick={handleSaveToBackend} 
            variant="secondary" 
            className="w-full"
            disabled={!browserSub}
          >
            <Database className="h-4 w-4 mr-2" />
            Save to Backend
          </Button>
          
          <Button 
            onClick={handleTestNotification} 
            variant="default" 
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
