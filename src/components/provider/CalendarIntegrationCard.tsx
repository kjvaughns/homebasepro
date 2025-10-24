import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CalendarIntegrationCard() {
  const [loading, setLoading] = useState(false);

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
      </CardContent>
    </Card>
  );
}
