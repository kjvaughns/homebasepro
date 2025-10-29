import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, AlertTriangle, CheckCircle, Clock, RefreshCw, Send, Database, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function NotificationsHealth() {
  const [testResults, setTestResults] = useState<any>(null);
  
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ["notifications-health"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notifications-health");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: outboxData } = useQuery({
    queryKey: ["notification-outbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_outbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: pushSubs } = useQuery({
    queryKey: ["push-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const triggerRetryWorker = async () => {
    try {
      const { error } = await supabase.functions.invoke("notification-retry-worker", {
        body: { immediate: true },
      });
      if (error) throw error;
      toast.success("Retry worker triggered successfully");
      refetch();
    } catch (error: any) {
      toast.error(`Failed to trigger retry worker: ${error.message}`);
    }
  };

  const testDispatch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("dispatch-notification", {
        body: {
          type: "announcement",
          userId: user.id,
          role: "admin",
          title: "Test Notification",
          body: "This is a test notification from the admin panel",
          forceChannels: { inapp: true, push: true, email: true },
        },
      });
      
      if (error) throw error;
      setTestResults({ type: "dispatch", data });
      toast.success("Test dispatch successful - check notification_outbox");
      refetch();
    } catch (error: any) {
      toast.error(`Dispatch test failed: ${error.message}`);
      setTestResults({ type: "dispatch", error: error.message });
    }
  };

  const testPushDirect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: user.id,
          title: "Direct Push Test",
          body: "Testing push notification directly",
          metadata: { test: true },
        },
      });
      
      if (error) throw error;
      setTestResults({ type: "push", data });
      toast.success("Push test completed - check results below");
    } catch (error: any) {
      toast.error(`Push test failed: ${error.message}`);
      setTestResults({ type: "push", error: error.message });
    }
  };

  const testEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("send-announcement", {
        body: {
          title: "Email Test from Admin",
          body: "This is a test email sent from the notifications health panel.",
          target_audience: "admins",
          send_email: true,
          send_push: false,
        },
      });
      
      if (error) throw error;
      toast.success("Test email queued - check your inbox");
      setTestResults({ type: "email", success: true });
    } catch (error: any) {
      toast.error(`Email test failed: ${error.message}`);
      setTestResults({ type: "email", error: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusColor = health?.status === "healthy" ? "text-green-500" : health?.status === "degraded" ? "text-yellow-500" : "text-red-500";
  const StatusIcon = health?.status === "healthy" ? CheckCircle : AlertTriangle;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications Health & Testing</h1>
          <p className="text-muted-foreground mt-1">Monitor, test, and debug notification delivery</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={triggerRetryWorker} variant="default" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Trigger Retry Worker
          </Button>
        </div>
      </div>

      {/* Testing Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            End-to-End Testing
          </CardTitle>
          <CardDescription>Test notification delivery across all channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={testDispatch} variant="outline" size="sm">
              <Send className="w-4 h-4 mr-2" />
              Test Dispatch (All Channels)
            </Button>
            <Button onClick={testPushDirect} variant="outline" size="sm">
              <Smartphone className="w-4 h-4 mr-2" />
              Test Push Notification
            </Button>
            <Button onClick={testEmail} variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Test Email
            </Button>
          </div>

          {testResults && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Test Results ({testResults.type}):</div>
              <pre className="text-xs overflow-auto max-h-40 bg-background p-2 rounded">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-8 h-8 ${statusColor}`} />
              <div>
                <CardTitle>System Status</CardTitle>
                <CardDescription>{new Date(health?.timestamp).toLocaleString()}</CardDescription>
              </div>
            </div>
            <Badge variant={health?.status === "healthy" ? "default" : "destructive"}>
              {health?.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        {health?.warnings && health.warnings.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              {health.warnings.map((warning: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-500">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.outbox?.pending || 0}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3 h-3" />
                Push: {health?.outbox?.byChannel?.push?.pending || 0}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Email: {health?.outbox?.byChannel?.email?.pending || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.outbox?.sent || 0}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3 h-3" />
                Push: {health?.outbox?.byChannel?.push?.sent || 0}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Email: {health?.outbox?.byChannel?.email?.sent || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.outbox?.failed || 0}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3 h-3" />
                Push: {health?.outbox?.byChannel?.push?.failed || 0}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Email: {health?.outbox?.byChannel?.email?.failed || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Data */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Notification Outbox (Last 20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {outboxData && outboxData.length > 0 ? (
                outboxData.map((entry: any) => (
                  <div key={entry.id} className="p-2 bg-muted rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={entry.status === 'sent' ? 'default' : entry.status === 'failed' ? 'destructive' : 'secondary'}>
                        {entry.status}
                      </Badge>
                      <span className="text-muted-foreground">{entry.channel}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Attempts: {entry.attempt_count} | Created: {new Date(entry.created_at).toLocaleString()}
                    </div>
                    {entry.last_error && (
                      <div className="mt-1 text-red-500">Error: {entry.last_error}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No outbox entries found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Push Subscriptions ({pushSubs?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {pushSubs && pushSubs.length > 0 ? (
                pushSubs.map((sub: any) => (
                  <div key={sub.id} className="p-2 bg-muted rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{sub.device_name || 'Unknown Device'}</span>
                      <Badge variant={sub.endpoint.includes('apple') ? 'default' : 'secondary'}>
                        {sub.endpoint.includes('apple') ? 'iOS' : 'Other'}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground truncate">
                      Endpoint: {sub.endpoint.substring(0, 50)}...
                    </div>
                    <div className="text-muted-foreground">
                      Created: {new Date(sub.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No push subscriptions found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
