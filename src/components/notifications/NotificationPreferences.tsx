import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Smartphone, Moon, MessageSquare, DollarSign, Briefcase, FileText, Star, Calendar, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface NotificationPrefs {
  announce_inapp: boolean;
  announce_push: boolean;
  announce_email: boolean;
  message_inapp: boolean;
  message_push: boolean;
  message_email: boolean;
  payment_inapp: boolean;
  payment_push: boolean;
  payment_email: boolean;
  payout_inapp: boolean;
  payout_push: boolean;
  payout_email: boolean;
  job_inapp: boolean;
  job_push: boolean;
  job_email: boolean;
  quote_inapp: boolean;
  quote_push: boolean;
  quote_email: boolean;
  review_inapp: boolean;
  review_push: boolean;
  review_email: boolean;
  booking_inapp: boolean;
  booking_push: boolean;
  booking_email: boolean;
  weekly_digest_email: boolean;
  weekly_digest_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [role, setRole] = useState<'provider' | 'homeowner'>('homeowner');
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();

      const userRole = profile?.user_type === 'provider' ? 'provider' : 'homeowner';
      setRole(userRole);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', userRole)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPrefs(data as NotificationPrefs);
      } else {
        // Create default preferences
        const defaultPrefs = {
          announce_inapp: true,
          announce_push: false,
          announce_email: true,
          message_inapp: true,
          message_push: true,
          message_email: false,
          payment_inapp: true,
          payment_push: true,
          payment_email: true,
          job_inapp: true,
          job_push: false,
          job_email: true,
          quote_inapp: true,
          quote_push: true,
          quote_email: true,
          review_inapp: true,
          review_push: true,
          review_email: false,
          booking_inapp: true,
          booking_push: true,
          booking_email: true,
          weekly_digest_email: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        };

        const { data: created } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, role: userRole, ...defaultPrefs })
          .select()
          .single();

        setPrefs(created as NotificationPrefs);
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!prefs) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .update(prefs)
        .eq('user_id', user.id)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Your notification preferences have been updated',
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.functions.invoke('dispatch-notification', {
        body: {
          type: 'announcement',
          userId: user.id,
          role,
          title: '🧪 Test Notification',
          body: 'This is a test notification to verify your settings are working correctly.',
          forceChannels: { inapp: true, push: true, email: false },
        },
      });

      toast({
        title: 'Test Sent',
        description: 'Check your notifications and devices',
      });
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const eventGroups = [
    { key: 'announce', label: 'Announcements', icon: Bell },
    { key: 'payment', label: 'Payments', icon: DollarSign },
    { key: 'payout', label: 'Payouts 🎉', icon: TrendingUp },
    { key: 'job', label: 'Jobs', icon: Briefcase },
    { key: 'quote', label: 'Quotes', icon: FileText },
    { key: 'review', label: 'Reviews', icon: Star },
    { key: 'booking', label: 'Bookings', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified for different events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Row */}
          <div className="grid grid-cols-4 gap-4 pb-2 border-b">
            <div className="font-medium">Event Type</div>
            <div className="flex items-center gap-2 font-medium">
              <Bell className="h-4 w-4" />
              <span>In-App</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <Smartphone className="h-4 w-4" />
              <span>Push</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </div>
          </div>

          {/* Event Groups */}
          {eventGroups.map((group) => (
            <div key={group.key} className="grid grid-cols-4 gap-4 items-center">
              <Label className="flex items-center gap-2">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                {group.label}
              </Label>
              <Switch
                checked={prefs[`${group.key}_inapp` as keyof NotificationPrefs] as boolean}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, [`${group.key}_inapp`]: checked })
                }
              />
              <Switch
                checked={prefs[`${group.key}_push` as keyof NotificationPrefs] as boolean}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, [`${group.key}_push`]: checked })
                }
              />
              <Switch
                checked={prefs[`${group.key}_email` as keyof NotificationPrefs] as boolean}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, [`${group.key}_email`]: checked })
                }
              />
            </div>
          ))}

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <Label>Quiet Hours (Do Not Disturb)</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Push and email notifications won't be sent during these hours
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet_start">Start Time</Label>
                <input
                  id="quiet_start"
                  type="time"
                  value={prefs.quiet_hours_start}
                  onChange={(e) =>
                    setPrefs({ ...prefs, quiet_hours_start: e.target.value })
                  }
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="quiet_end">End Time</Label>
                <input
                  id="quiet_end"
                  type="time"
                  value={prefs.quiet_hours_end}
                  onChange={(e) =>
                    setPrefs({ ...prefs, quiet_hours_end: e.target.value })
                  }
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Weekly Digest */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Weekly Digest 🌟</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Get a friendly, celebratory recap of your week's payouts and earnings every Monday morning
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly_digest_enabled">Enable Weekly Summary</Label>
              <Switch
                id="weekly_digest_enabled"
                checked={prefs.weekly_digest_enabled}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, weekly_digest_enabled: checked, weekly_digest_email: checked })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={savePreferences} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
            <Button variant="outline" onClick={sendTestNotification}>
              Send Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
