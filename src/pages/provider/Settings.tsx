import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardDescription } from "@/components/ui/card";
import { AvatarUpload } from "@/components/AvatarUpload";
import { PWASettingsCard } from "@/components/pwa/PWASettingsCard";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  service_area: string | null;
  service_type: string[] | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load subscription
      const { data: subData } = await supabase
        .from("organization_subscriptions")
        .select("*")
        .eq("organization_id", data.id)
        .eq("status", "active")
        .single();

      if (subData) {
        setSubscription(subData);

        // Load plan details
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("tier", subData.plan_tier)
          .single();

        setPlan(planData);
      }
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-muted";
      case "growth":
        return "bg-primary/20 text-primary";
      case "pro":
        return "bg-accent/20 text-accent";
      case "scale":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold break-words">{organization.name}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your organization settings</p>
      </div>
      
      {/* Role Switcher on Mobile */}
      <div className="lg:hidden">
        <RoleSwitcher />
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Organization Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing & Subscription</TabsTrigger>
          <TabsTrigger value="pwa">App & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="billing">
          {plan ? (
            <Card className="p-6 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
                    <Badge className={getTierColor(plan.tier)}>
                      {plan.tier.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {plan.client_limit
                      ? `Up to ${plan.client_limit} clients`
                      : "Unlimited clients"}{" "}
                    • {plan.transaction_fee_percent}% transaction fee
                  </p>
                  <div className="flex gap-4">
                    {plan.tier !== "scale" && (
                      <Button
                        onClick={() => navigate("/pricing")}
                        variant="default"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    )}
                    <Button variant="outline">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">
                    Monthly Price
                  </p>
                  <p className="text-3xl font-bold">
                    ${(plan.price_monthly / 100).toFixed(0)}
                    <span className="text-lg text-muted-foreground">/mo</span>
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-muted-foreground">No active subscription</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pwa">
          <PWASettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
