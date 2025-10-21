import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NotificationPreferences {
  bookings_enabled: boolean;
  messages_enabled: boolean;
  payments_enabled: boolean;
  reminders_enabled: boolean;
  marketing_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    bookings_enabled: true,
    messages_enabled: true,
    payments_enabled: true,
    reminders_enabled: true,
    marketing_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    quiet_hours_timezone: 'America/New_York'
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences saved"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Manage how you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="bookings">Booking Updates</Label>
              <p className="text-sm text-muted-foreground">
                New bookings, confirmations, and status changes
              </p>
            </div>
            <Switch
              id="bookings"
              checked={preferences.bookings_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, bookings_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="messages">Messages</Label>
              <p className="text-sm text-muted-foreground">
                New messages from service providers
              </p>
            </div>
            <Switch
              id="messages"
              checked={preferences.messages_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, messages_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="payments">Payment Updates</Label>
              <p className="text-sm text-muted-foreground">
                Payment confirmations and refunds
              </p>
            </div>
            <Switch
              id="payments"
              checked={preferences.payments_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, payments_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reminders">Appointment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                24-hour reminders before your appointments
              </p>
            </div>
            <Switch
              id="reminders"
              checked={preferences.reminders_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, reminders_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="marketing">Marketing & Tips</Label>
              <p className="text-sm text-muted-foreground">
                Promotional offers and home maintenance tips
              </p>
            </div>
            <Switch
              id="marketing"
              checked={preferences.marketing_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, marketing_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Don't receive notifications during these hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select
                value={preferences.quiet_hours_start || "none"}
                onValueChange={(value) =>
                  setPreferences({
                    ...preferences,
                    quiet_hours_start: value === "none" ? null : value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Disabled</SelectItem>
                  {timeOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Select
                value={preferences.quiet_hours_end || "none"}
                onValueChange={(value) =>
                  setPreferences({
                    ...preferences,
                    quiet_hours_end: value === "none" ? null : value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Disabled</SelectItem>
                  {timeOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {preferences.quiet_hours_start && preferences.quiet_hours_end
              ? `Notifications will be silenced from ${timeOptions.find(t => t.value === preferences.quiet_hours_start)?.label} to ${timeOptions.find(t => t.value === preferences.quiet_hours_end)?.label}`
              : "Quiet hours are currently disabled"}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
