import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import { AdminProfileSettings } from "@/components/admin/AdminProfileSettings";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homeownerRegistration, setHomeownerRegistration] = useState(false);
  const [providerRegistration, setProviderRegistration] = useState(false);
  const [betaMode, setBetaMode] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: regSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'registration_enabled')
        .single();

      const { data: betaSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'beta_mode')
        .single();

      if (regSettings) {
        const regValue = regSettings.value as { homeowner?: boolean; provider?: boolean };
        setHomeownerRegistration(regValue.homeowner || false);
        setProviderRegistration(regValue.provider || false);
      }

      if (betaSettings) {
        setBetaMode(Boolean(betaSettings.value));
      }
    } catch (error: any) {
      toast({
        title: "Failed to load settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: regError } = await supabase
        .from('app_settings')
        .update({ 
          value: { homeowner: homeownerRegistration, provider: providerRegistration },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'registration_enabled');

      const { error: betaError } = await supabase
        .from('app_settings')
        .update({ 
          value: betaMode,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'beta_mode');

      if (regError) throw regError;
      if (betaError) throw betaError;

      toast({
        title: "Settings saved",
        description: "Registration settings have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and platform settings</p>
      </div>

      {isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Switch View</CardTitle>
            <CardDescription>Toggle between Homeowner, Provider, and Admin views</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleSwitcher />
          </CardContent>
        </Card>
      )}

      <AdminProfileSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Registration & Beta Access
          </CardTitle>
          <CardDescription>Control user registration and beta mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Beta Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable invite-only beta access system
              </p>
            </div>
            <Switch 
              checked={betaMode} 
              onCheckedChange={setBetaMode}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Homeowner Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow homeowners to register without invite
              </p>
            </div>
            <Switch 
              checked={homeownerRegistration}
              onCheckedChange={setHomeownerRegistration}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Provider Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow providers to register without invite
              </p>
            </div>
            <Switch 
              checked={providerRegistration}
              onCheckedChange={setProviderRegistration}
              disabled={loading}
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
