import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/AvatarUpload";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  service_area: string | null;
  service_type: string[] | null;
}

export default function ProfileSettings() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.user.id)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: organization.name,
          description: organization.description,
          email: organization.email,
          phone: organization.phone,
          service_area: organization.service_area,
          service_type: organization.service_type,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!organization) {
    return <div className="p-8">Organization not found</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your profile and organization details</p>
      </div>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              avatarUrl={profile.avatar_url}
              fullName={profile.full_name}
              userId={profile.user_id}
              onAvatarUpdate={(url) => setProfile({ ...profile, avatar_url: url })}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              value={organization.name}
              onChange={(e) =>
                setOrganization({ ...organization, name: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={organization.description || ""}
              onChange={(e) =>
                setOrganization({ ...organization, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              value={organization.email || ""}
              onChange={(e) =>
                setOrganization({ ...organization, email: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={organization.phone || ""}
              onChange={(e) =>
                setOrganization({ ...organization, phone: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service_type">Service Types (comma-separated)</Label>
            <Input
              id="service_type"
              value={Array.isArray(organization.service_type) ? organization.service_type.join(", ") : ""}
              onChange={(e) =>
                setOrganization({
                  ...organization,
                  service_type: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                })
              }
              placeholder="e.g., HVAC, Plumbing, Electrical"
            />
            <p className="text-xs text-muted-foreground">Separate multiple services with commas</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service_area">Service Area</Label>
            <Input
              id="service_area"
              value={organization.service_area || ""}
              onChange={(e) =>
                setOrganization({
                  ...organization,
                  service_area: e.target.value,
                })
              }
              placeholder="e.g., Miami, FL"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
