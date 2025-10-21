import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { SocialLinksEditor } from "@/components/provider/SocialLinksEditor";

export default function AccountSocial() {
  const [organization, setOrganization] = useState<any>(null);
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
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load social links");
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
          socials: organization.socials,
        })
        .eq("id", organization.id);

      if (error) throw error;
      toast.success("Social links updated successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to update social links");
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
        <h1 className="text-3xl font-bold">Social Links</h1>
        <p className="text-muted-foreground">
          Connect your social media profiles and website
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Social Media Profiles</CardTitle>
          <CardDescription>
            Add links to your social media accounts. These will appear on your public profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SocialLinksEditor
            organizationId={organization.id}
            currentSocials={organization.socials || {}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
