import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsHealth() {
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ["notifications-health"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notifications-health");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
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
          <h1 className="text-3xl font-bold">Notifications Health</h1>
          <p className="text-muted-foreground mt-1">Monitor notification delivery status</p>
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
    </div>
  );
}
