import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  User,
  Users,
  Settings,
  DollarSign,
  BarChart3,
  Wrench,
  Package,
  Plug,
  Megaphone,
  HelpCircle,
  CreditCard,
  Sparkles,
  Gift,
  LogOut,
  MessageSquare,
} from "lucide-react";

export default function More() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("owner_id", user.id)
        .single();

      setOrganization(org);
    } catch (error) {
      console.error("Error loading organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const quickActions = [
    {
      title: "Financial",
      icon: DollarSign,
      action: () => navigate('/provider/accounting'),
    },
    {
      title: "Analytics",
      icon: BarChart3,
      action: () => navigate('/provider/analytics'),
    },
    {
      title: "Services",
      icon: Wrench,
      action: () => navigate('/provider/services'),
    },
    {
      title: "Materials",
      icon: Package,
      action: () => navigate('/provider/parts-materials'),
    },
  ];

  const accountItems = [
    {
      title: "Profile",
      icon: User,
      action: () => navigate('/provider/account'),
    },
    {
      title: "Company Details",
      icon: Building2,
      action: () => navigate('/provider/account'),
    },
    {
      title: "Team Management",
      icon: Users,
      action: () => navigate('/provider/team'),
    },
    {
      title: "Subscription",
      icon: CreditCard,
      action: () => navigate('/provider/settings'),
    },
  ];

  const toolsItems = [
    {
      title: "AI Assistant Settings",
      icon: Sparkles,
      action: () => {}, // TODO: AI settings
    },
    {
      title: "Integrations",
      icon: Plug,
      action: () => navigate('/provider/settings?tab=integrations'),
    },
    {
      title: "Marketing Tools",
      icon: Megaphone,
      action: () => {}, // TODO: Marketing tools
    },
  ];

  const supportItems = [
    {
      title: "Help Center",
      icon: HelpCircle,
      action: () => window.open('https://homebasepro.com/help', '_blank'),
    },
    {
      title: "Contact Support",
      icon: MessageSquare,
      action: () => {
        if (typeof window !== 'undefined' && (window as any).Intercom) {
          (window as any).Intercom('show');
        }
      },
    },
    {
      title: "Product Updates",
      icon: Sparkles,
      action: () => {}, // TODO: Product updates
    },
    {
      title: "Refer a Friend",
      icon: Gift,
      action: () => {}, // TODO: Referral program
    },
  ];

  const preferencesItems = [
    {
      title: "Notification Settings",
      icon: Settings,
      action: () => navigate('/provider/notification-settings'),
    },
    {
      title: "App Settings",
      icon: Settings,
      action: () => navigate('/provider/settings'),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="h-6 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">More</h1>
        {organization && (
          <p className="text-sm text-muted-foreground mt-1">{organization.name}</p>
        )}
      </div>

      {/* Quick Actions - 2 Column Grid */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-center">{item.title}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Account Section */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Account
        </h2>
        <Card className="divide-y">
          {accountItems.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex items-center gap-3 p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full text-left"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.title}</span>
            </button>
          ))}
        </Card>
      </div>

      {/* Tools Section */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Tools
        </h2>
        <Card className="divide-y">
          {toolsItems.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex items-center gap-3 p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full text-left"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.title}</span>
            </button>
          ))}
        </Card>
      </div>

      {/* Support Section */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Support
        </h2>
        <Card className="divide-y">
          {supportItems.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex items-center gap-3 p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full text-left"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.title}</span>
            </button>
          ))}
        </Card>
      </div>

      {/* Preferences Section */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Preferences
        </h2>
        <Card className="divide-y">
          {preferencesItems.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              className="flex items-center gap-3 p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full text-left"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.title}</span>
            </button>
          ))}
        </Card>
      </div>

      <Separator />

      {/* Logout Button */}
      <Button
        onClick={handleSignOut}
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Logout
      </Button>
    </div>
  );
}
