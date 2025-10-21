import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/AvatarUpload";
import { HeroImageUpload } from "@/components/provider/HeroImageUpload";
import { Separator } from "@/components/ui/separator";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  service_type: string[] | null;
  logo_url: string | null;
  hero_image_url: string | null;
}

export default function AccountProfile() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (orgError) throw orgError;
      setOrganization(org);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: organization.name,
          description: organization.description,
          phone: organization.phone,
          email: organization.email,
          service_area: organization.service_area,
          service_type: organization.service_type,
        })
        .eq("id", organization.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to update profile");
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your public-facing business profile
        </p>
      </div>

      {/* Your Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Your Avatar</CardTitle>
          <CardDescription>This appears on your posts and comments</CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <AvatarUpload
              userId={profile.user_id}
              avatarUrl={profile.avatar_url}
              fullName={profile.full_name || organization.name}
              onAvatarUpdate={loadData}
            />
          )}
        </CardContent>
      </Card>

      {/* Brand Images */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Images</CardTitle>
          <CardDescription>Logo and hero image for your business profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Logo</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Your logo appears on booking pages and search results
            </p>
            <AvatarUpload
              userId={organization.id}
              avatarUrl={organization.logo_url}
              fullName={organization.name}
              onAvatarUpdate={loadData}
            />
          </div>

          <Separator />

          <div>
            <Label>Hero Image</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Large banner image displayed at the top of your profile
            </p>
            <HeroImageUpload
              organizationId={organization.id}
              currentHeroUrl={organization.hero_image_url}
              onUploadComplete={loadData}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Basic details about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              value={organization.name}
              onChange={(e) =>
                setOrganization({ ...organization, name: e.target.value })
              }
              placeholder="Your Business Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={organization.description || ""}
              onChange={(e) =>
                setOrganization({ ...organization, description: e.target.value })
              }
              placeholder="Tell customers about your business"
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={organization.phone || ""}
                onChange={(e) =>
                  setOrganization({ ...organization, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={organization.email || ""}
                onChange={(e) =>
                  setOrganization({ ...organization, email: e.target.value })
                }
                placeholder="contact@business.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_area">Service Area</Label>
            <Input
              id="service_area"
              value={organization.service_area || ""}
              onChange={(e) =>
                setOrganization({ ...organization, service_area: e.target.value })
              }
              placeholder="ZIP codes or cities served (e.g., 90210, 90211)"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
