import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, CreditCard, DollarSign, Plug, Bell, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoScrollToInput } from "@/hooks/useAutoScrollToInput";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { SectionHeader } from "@/components/provider/settings/SectionHeader";
import { BusinessProfileSection } from "@/components/provider/settings/BusinessProfileSection";
import { BillingSection } from "@/components/provider/settings/BillingSection";
import { PaymentsSection } from "@/components/provider/settings/PaymentsSection";
import { IntegrationsSection } from "@/components/provider/settings/IntegrationsSection";
import { PreferencesSection } from "@/components/provider/settings/PreferencesSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

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
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const keyboardHeight = useKeyboardHeight();
  
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
      const { data: accountData, error: accountError } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create-account' }
      });
      
      if (accountError) throw accountError;

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

  const openStripeDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'dashboard-link' }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    }
  };

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAdminRole = roles?.some(r => r.role === 'admin');
      setIsAdmin(hasAdminRole || false);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (orgError) throw orgError;

      setOrganization(org);
      setPlan(org.plan || 'free');

      if (!hasAdminRole) {
        await loadSubscription();
      }
    } catch (error: any) {
      console.error('Error loading organization:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'get-subscription' },
      });

      if (error) throw error;
      
      if (data?.subscription?.stripe_subscription_id) {
        const { data: stripeData } = await supabase.functions.invoke('payments-api', {
          body: { 
            action: 'get-stripe-subscription',
            subscriptionId: data.subscription.stripe_subscription_id,
          },
        });
        
        setSubscription({
          ...data.subscription,
          cancel_at_period_end: stripeData?.subscription?.cancel_at_period_end,
        });
      } else {
        setSubscription(data?.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('payments-api', {
        body: { action: 'create-portal-session' }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    }
  };

  const handleOrganizationUpdate = (field: string, value: any) => {
    if (!organization) return;
    setOrganization({ ...organization, [field]: value });
  };

  const handleSaveProfile = async () => {
    if (!organization) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          description: organization.description,
          email: organization.email,
          phone: organization.phone,
          service_area: organization.service_area,
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-24">
          <Skeleton className="h-12 w-64" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 pb-24">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your business profile and platform settings</p>
        </div>

        {/* Section 1: Business Profile */}
        <div className="space-y-4">
          <SectionHeader 
            icon={User}
            title="Business Profile"
            description="Your public-facing HomeBase identity"
          />
          <BusinessProfileSection 
            organization={organization}
            onUpdate={handleOrganizationUpdate}
          />
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        {/* Section 2: Billing & Subscription */}
        <div className="space-y-4">
          <SectionHeader 
            icon={CreditCard}
            title="Billing & Subscription"
            description="Manage your plan and transaction fees"
          />
          <BillingSection 
            currentPlan={plan}
            isAdmin={isAdmin}
            subscription={subscription}
            onPlanChanged={() => {
              loadOrganization();
              loadSubscription();
            }}
            onManageSubscription={handleManageSubscription}
          />
        </div>

        {/* Section 3: Payments & Payouts */}
        <div className="space-y-4">
          <SectionHeader 
            icon={DollarSign}
            title="Payments & Payouts"
            description="Stripe integration and payment settings"
          />
          <PaymentsSection 
            stripeConnected={stripeConnected}
            stripeLoading={stripeLoading}
            onConnect={handleStripeConnect}
            onOpenDashboard={openStripeDashboard}
          />
        </div>

        {/* Section 4: Integrations */}
        <div className="space-y-4">
          <SectionHeader 
            icon={Plug}
            title="Integrations"
            description="Connect external tools and services"
          />
          <IntegrationsSection organizationId={organization?.id} />
        </div>

        {/* Section 5: Preferences */}
        <div className="space-y-4">
          <SectionHeader 
            icon={Bell}
            title="Preferences"
            description="Notifications and app settings"
          />
          <PreferencesSection />
        </div>

        {/* Sign Out */}
        <div className="pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="w-full md:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
