import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export function CalendarIntegrationCard() {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkSyncStatus();
    // Subscribe to sync log changes
    const channel = supabase
      .channel('calendar_sync_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_sync_logs'
      }, () => {
        checkSyncStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkSyncStatus = async () => {
    try {
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*, calendar_sync_logs(status, started_at, error_details)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setSyncStatus(integration);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-auth', {
        body: { action: 'connect', provider }
      });

      if (error) throw error;
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error('Failed to connect calendar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReauthorize = async () => {
    if (!syncStatus) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-auth', {
        body: { action: 'reconnect', integrationId: syncStatus.id }
      });

      if (error) throw error;

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error('Failed to reauthorize: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-calendar-events', {
        body: { integrationId: syncStatus.id }
      });

      if (error) throw error;

      toast.success('Calendar sync initiated');
      setTimeout(checkSyncStatus, 2000);
    } catch (error: any) {
      toast.error('Failed to sync calendar: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your calendar to automatically block off booked times and sync appointments.
        </p>

        {syncStatus && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {syncStatus.provider === 'google' ? 'Google Calendar' : 'Outlook'}
              </span>
              <Badge variant={syncStatus.status === 'active' ? 'default' : 'destructive'}>
                {syncStatus.status}
              </Badge>
            </div>

            {syncStatus.last_sync_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Last synced {format(new Date(syncStatus.last_sync_at), 'PPp')}
              </div>
            )}

            {syncStatus.error_message && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Sync Error</p>
                  <p className="text-xs text-muted-foreground">{syncStatus.error_message}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleManualSync}
                disabled={syncing}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync Now
              </Button>
              
              {syncStatus.status === 'error' && (
                <Button
                  onClick={handleReauthorize}
                  disabled={loading}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                  Re-authorize
                </Button>
              )}
            </div>
          </div>
        )}
        
        {!syncStatus && (
          <div className="space-y-3">
            <Button
              onClick={() => handleConnect('google')}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
              Connect Google Calendar
            </Button>

            <Button
              onClick={() => handleConnect('microsoft')}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
              Connect Outlook Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
