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
import { SubscriptionManager } from "@/components/provider/SubscriptionManager";
import { PublicProfileCard } from "@/components/provider/PublicProfileCard";
import { HeroImageUpload } from "@/components/provider/HeroImageUpload";
import { SocialLinksEditor } from "@/components/provider/SocialLinksEditor";
import { CalendarIntegrationCard } from "@/components/provider/CalendarIntegrationCard";
import { BookingLinkManager } from "@/components/provider/BookingLinkManager";
import { useAutoScrollToInput } from "@/hooks/useAutoScrollToInput";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  service_area: string | null;
  service_type: string[] | null;
  logo_url?: string | null;
  socials?: any;
  plan?: string;
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
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const keyboardHeight = useKeyboardHeight();
  
  // Enable auto-scroll to focused inputs on mobile
  useAutoScrollToInput();

  useEffect(() => {
    loadOrganization();
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'check-status' }
      });
      
      if (!error && data) {
        setStripeConnected(data.connected && data.complete);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      // First create account if needed
      const { data: accountData, error: accountError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account' }
      });
      
      if (accountError) throw accountError;

      // Then get onboarding link
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'account-link' }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
    } finally {
      setStripeLoading(false);
    }
  };

  const loadOrganization = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Check if user has admin role
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.user.id)
        .eq('role', 'admin')
        .single();

      if (adminRole) {
        setIsAdmin(true);
      }

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
    <div 
      className="p-4 sm:p-8 space-y-4 sm:space-y-6 pb-20 md:pb-6 max-w-full overflow-x-hidden"
      style={{
        paddingBottom: keyboardHeight > 0 
          ? `${keyboardHeight + 80}px` 
          : undefined
      }}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold break-words">{organization.name}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your organization settings</p>
      </div>
      
      {/* Role Switcher on Mobile */}
      <div className="lg:hidden">
        <RoleSwitcher />
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 max-w-full">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm">Billing</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">Integrations</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
          <TabsTrigger value="pwa" className="text-xs sm:text-sm">App</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload your professional headshot</CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarUpload
                  avatarUrl={profile.avatar_url}
                  fullName={profile.full_name || "User"}
                  userId={profile.user_id}
                  onAvatarUpdate={loadOrganization}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Your public business profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={organization.name}
                  onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={organization.description || ""}
                  onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={organization.email || ""}
                  onChange={(e) => setOrganization({ ...organization, email: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={organization.phone || ""}
                  onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-area">Service Area</Label>
                <Input
                  id="service-area"
                  value={organization.service_area || ""}
                  onChange={(e) => setOrganization({ ...organization, service_area: e.target.value })}
                  placeholder="e.g., Austin, TX"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Business Info"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Images</CardTitle>
              <CardDescription>Logo and hero image for your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-2 block">Logo</Label>
                <AvatarUpload
                  avatarUrl={organization.logo_url || ""}
                  fullName={organization.name}
                  userId={organization.id}
                  onAvatarUpdate={loadOrganization}
                  size="md"
                />
              </div>
              
              <div>
                <Label className="mb-2 block">Hero Image</Label>
                <HeroImageUpload 
                  organizationId={organization.id}
                  onUploadComplete={loadOrganization}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <SocialLinksEditor
                organizationId={organization.id}
                currentSocials={organization.socials || {}}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Links</CardTitle>
              <CardDescription>Create your custom booking link</CardDescription>
            </CardHeader>
            <CardContent>
              <BookingLinkManager organizationId={organization.id} />
            </CardContent>
          </Card>

          <PublicProfileCard 
            organizationId={organization.id}
            organizationSlug={organization.slug}
            organizationName={organization.name}
            organizationLogo={organization.logo_url || undefined}
          />
        </TabsContent>

        <TabsContent value="billing">
          <SubscriptionManager 
            currentPlan={isAdmin ? 'scale' : (organization?.plan || 'free')}
            isAdmin={isAdmin}
            onPlanChanged={loadOrganization}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing</CardTitle>
              <CardDescription>
                Connect your Stripe account to accept payments from clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stripeConnected ? (
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium">Stripe Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is ready to accept payments
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-emerald-600">Active</Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Why Connect Stripe?</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• Accept credit card and ACH payments</li>
                      <li>• Create payment links and invoices</li>
                      <li>• Automated payment tracking</li>
                      <li>• Secure and compliant processing</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={handleStripeConnect} 
                    disabled={stripeLoading}
                    className="w-full"
                  >
                    {stripeLoading ? "Connecting..." : "Connect Stripe Account"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    You'll be redirected to Stripe to complete the setup
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
                <Input
                  id="payment-terms"
                  type="number"
                  placeholder="30"
                  disabled
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-send Invoices</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically email invoices to clients
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Payment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send automated reminder emails
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <CalendarIntegrationCard />
          {organization && <BookingLinkManager organizationId={organization.id} />}
          
          <Card>
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
              <CardDescription>
                Connect additional third-party services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Coming soon: QuickBooks, Zapier, and more</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="text-base font-medium">Job Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified 1 hour before scheduled jobs
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="text-base font-medium">Payment Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts when payments are received
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <Label className="text-base font-medium">Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified of new client messages
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily summary emails
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
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
