import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  service_type: string[] | null;
  service_area: string | null;
  business_address?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_zip?: string | null;
  business_lat?: number | null;
  business_lng?: number | null;
}

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateDescription = async () => {
    if (!organization) return;
    
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-provider-description', {
        body: {
          description_prompt: organization.description || '',
          trade: organization.service_type?.join(', ') || '',
          current_description: organization.description || ''
        }
      });

      if (error) throw error;

      if (data?.description) {
        setOrganization({ ...organization, description: data.description });
        toast.success('Description generated! Review and save when ready.');
      }
    } catch (error: any) {
      console.error('Error generating description:', error);
      toast.error(error.message || 'Failed to generate description');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePreviewProfile = () => {
    if (!organization) return;
    
    // Open preview in new tab - adjust URL as needed
    const username = organization.name.toLowerCase().replace(/\s+/g, '-');
    window.open(`/marketplace/provider/${username}?preview=true`, '_blank');
  };

  const handleSave = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      const updates = {
        name: organization.name,
        description: organization.description,
        email: organization.email,
        phone: organization.phone,
        service_type: organization.service_type,
        service_area: organization.service_area,
        business_address: organization.business_address,
        business_city: organization.business_city,
        business_state: organization.business_state,
        business_zip: organization.business_zip,
        business_lat: organization.business_lat,
        business_lng: organization.business_lng,
      };

      const { error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", organization.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Organization not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <ChangePasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />
      
      <div className="space-y-6">
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
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
            <CardDescription>Your business information and details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={organization.name}
                onChange={(e) =>
                  setOrganization({ ...organization, name: e.target.value })
                }
                style={{ fontSize: '16px' }}
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
                rows={4}
                style={{ fontSize: '16px' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={organization.email || ""}
                onChange={(e) =>
                  setOrganization({ ...organization, email: e.target.value })
                }
                style={{ fontSize: '16px' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={organization.phone || ""}
                onChange={(e) =>
                  setOrganization({ ...organization, phone: e.target.value })
                }
                style={{ fontSize: '16px' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_type">Service Types</Label>
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
                style={{ fontSize: '16px' }}
              />
              <p className="text-sm text-muted-foreground">Separate multiple services with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_area">Service Area (ZIP Codes)</Label>
              <Input
                id="service_area"
                value={organization.service_area || ""}
                onChange={(e) =>
                  setOrganization({
                    ...organization,
                    service_area: e.target.value,
                  })
                }
                placeholder="e.g., 10001, 10002, 10003"
                style={{ fontSize: '16px' }}
              />
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Location</CardTitle>
            <CardDescription>
              Your business address and service jurisdiction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressAutocomplete
              label="Business Address"
              placeholder="Start typing your business address..."
              defaultValue={organization.business_address || ''}
              onAddressSelect={(address) => {
                setOrganization({
                  ...organization,
                  business_address: address.street,
                  business_city: address.city,
                  business_state: address.state,
                  business_zip: address.zip,
                  business_lat: address.lat,
                  business_lng: address.lng,
                });
              }}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={organization.business_city || ''}
                  readOnly
                  placeholder="Auto-populated"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={organization.business_state || ''}
                  readOnly
                  placeholder="Auto-populated"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input
                value={organization.business_zip || ''}
                readOnly
                placeholder="Auto-populated"
              />
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Update Location"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
            <CardDescription>
              Manage your password and account security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowPasswordDialog(true)} variant="outline">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
