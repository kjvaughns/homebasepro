import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { AvatarUpload } from "@/components/AvatarUpload";
import { PWASettingsCard } from "@/components/pwa/PWASettingsCard";

export default function HomeownerSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile(data);
        setFormData({ full_name: data.full_name || "", phone: data.phone || "" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: formData.full_name, phone: formData.phone })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: user.id,
          full_name: formData.full_name,
          phone: formData.phone,
          user_type: "homeowner",
        });
        if (error) throw error;
      }

      toast({ title: "Success", description: "Profile updated successfully" });
      loadProfile();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Role Switcher on Mobile */}
      {isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Switch Role</CardTitle>
            <CardDescription>Toggle between homeowner and provider views</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleSwitcher />
          </CardContent>
        </Card>
      )}

  <Tabs defaultValue="profile" className="space-y-4">
  <TabsList
    className="
      w-full grid grid-cols-2 md:grid-cols-4 gap-3 p-0
      bg-transparent border-0
    "
  >
    <TabsTrigger
      value="profile"
      className="
        w-full min-w-0 min-h-[44px] justify-center truncate
        rounded-lg border bg-card hover:bg-accent transition-colors
        data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary
      "
    >
      Profile
    </TabsTrigger>

    <TabsTrigger
      value="notifications"
      className="
        w-full min-w-0 min-h-[44px] justify-center truncate
        rounded-lg border bg-card hover:bg-accent transition-colors
        data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary
      "
    >
      Notifs
    </TabsTrigger>

    <TabsTrigger
      value="security"
      className="
        w-full min-w-0 min-h-[44px] justify-center truncate
        rounded-lg border bg-card hover:bg-accent transition-colors
        data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary
      "
    >
      Security
    </TabsTrigger>

    <TabsTrigger
      value="pwa"
      className="
        w-full min-w-0 min-h-[44px] justify-center truncate
        rounded-lg border bg-card hover:bg-accent transition-colors
        data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary
      "
    >
      App
    </TabsTrigger>
  </TabsList>

  {/* ...your TabsContent blocks unchanged ... */}
</Tabs>



        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {profile && (
                  <AvatarUpload
                    avatarUrl={profile.avatar_url}
                    fullName={profile.full_name}
                    userId={profile.user_id}
                    onAvatarUpdate={(url) => setProfile({ ...profile, avatar_url: url })}
                  />
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Notification preferences coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Password</h3>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Sign Out</h3>
                <Button variant="destructive" size="sm" onClick={handleSignOut}>
                  Sign Out of Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pwa">
          <PWASettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
