import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  service_area: string | null;
  service_type: string | null;
}

export default function Settings() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.user.id)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error("Error loading organization:", error);
      toast({
        title: "Error",
        description: "Failed to load organization settings",
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
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization settings</p>
      </div>

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
            <Label htmlFor="service_type">Service Type</Label>
            <Input
              id="service_type"
              value={organization.service_type || ""}
              onChange={(e) =>
                setOrganization({ ...organization, service_type: e.target.value })
              }
              placeholder="e.g., Lawn Care, Pool Maintenance"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service_area">Service Area</Label>
            <Input
              id="service_area"
              value={organization.service_area || ""}
              onChange={(e) =>
                setOrganization({ ...organization, service_area: e.target.value })
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
