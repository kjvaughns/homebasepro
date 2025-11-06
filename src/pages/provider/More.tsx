import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Briefcase,
  Users,
  BarChart3,
  User,
  Image,
  Star,
  Link as LinkIcon,
  Globe,
  Gift,
  Settings,
  Bell,
  HelpCircle,
  Video,
  MessageSquare,
  Sparkles,
  LogOut,
  Plus,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { QuickActionsSheet } from "@/components/provider/QuickActionsSheet";

export default function More() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

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

  const businessHubItems = [
    {
      title: "Payments & Balance",
      description: "View earnings, manage payouts, and transaction history",
      icon: DollarSign,
      action: () => navigate('/provider/balance'),
    },
    {
      title: "Jobs & Work Orders",
      description: "Schedule, track, and complete service jobs",
      icon: Briefcase,
      action: () => navigate('/provider/jobs'),
    },
    {
      title: "Team Management",
      description: "Manage staff, time tracking, and commissions",
      icon: Users,
      action: () => navigate('/provider/team'),
    },
    {
      title: "Analytics",
      description: "Track revenue, client growth, and performance metrics",
      icon: BarChart3,
      action: () => navigate('/provider/analytics'),
    },
  ];

  const marketplaceItems = [
    {
      title: "Your Profile",
      description: "Logo, bio, service area, and business hours",
      icon: User,
      action: () => navigate('/provider/account/profile'),
    },
    {
      title: "Portfolio",
      description: "Showcase your best work with photos",
      icon: Image,
      action: () => navigate('/provider/portfolio'),
    },
    {
      title: "Reviews & Ratings",
      description: "View feedback and respond to clients",
      icon: Star,
      action: () => navigate('/provider/reviews'),
    },
    {
      title: "Share Links",
      description: "QR codes and branded booking links",
      icon: LinkIcon,
      action: () => navigate('/provider/share-links'),
    },
    {
      title: "Social Media",
      description: "Connect Instagram, Facebook, and website",
      icon: Globe,
      action: () => navigate('/provider/account/social'),
    },
    {
      title: "Refer & Earn",
      description: "Invite other pros and earn rewards",
      icon: Gift,
      action: () => navigate('/club'),
      badge: "Earn $50",
    },
  ];

  const supportItems = [
    {
      title: "App Settings",
      description: "Subscription, integrations, and preferences",
      icon: Settings,
      action: () => navigate('/provider/settings'),
    },
    {
      title: "Notifications",
      description: "Manage alerts and email preferences",
      icon: Bell,
      action: () => navigate('/provider/notification-settings'),
    },
    {
      title: "Help Center",
      description: "FAQs, guides, and troubleshooting",
      icon: HelpCircle,
      action: () => window.open('https://homebasepro.com/help', '_blank'),
      external: true,
    },
    {
      title: "Video Tutorials",
      description: "Learn HomeBase with step-by-step videos",
      icon: Video,
      action: () => window.open('https://homebasepro.com/tutorials', '_blank'),
      external: true,
    },
    {
      title: "Contact Support",
      description: "Chat with our team for help",
      icon: MessageSquare,
      action: () => {
        if (typeof window !== 'undefined' && (window as any).Intercom) {
          (window as any).Intercom('show');
        }
      },
    },
    {
      title: "Product Updates",
      description: "See what's new in HomeBase",
      icon: Sparkles,
      action: () => navigate('/announcements'),
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
    <>
      <div className="p-6 space-y-8 pb-32 md:pb-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">More</h1>
            {organization && (
              <p className="text-sm text-muted-foreground mt-1">{organization.name}</p>
            )}
          </div>
        </div>

        {/* Business Hub */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">💼 Business Hub</h2>
            <p className="text-xs text-muted-foreground">Run your day-to-day operations</p>
          </div>
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {businessHubItems.map((item) => (
                <button
                  key={item.title}
                  onClick={item.action}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-accent/50 active:bg-accent transition-all duration-200 hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Marketplace Profile */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">✨ Marketplace Profile</h2>
            <p className="text-xs text-muted-foreground">Your public brand presence</p>
          </div>
          <Card className="divide-y">
            {marketplaceItems.map((item) => (
              <button
                key={item.title}
                onClick={item.action}
                className="flex items-center gap-4 p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full text-left"
              >
                <item.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {item.title}
                    {item.badge && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </Card>
        </div>

        {/* Support & Settings */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">🛠️ Support & Settings</h2>
            <p className="text-xs text-muted-foreground">Help, preferences, and AI tools</p>
          </div>
          <Card className="divide-y">
            {supportItems.map((item) => (
              <button
                key={item.title}
                onClick={item.action}
                className="flex items-center gap-4 p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full text-left"
              >
                <item.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                </div>
                {item.external ? (
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
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

      {/* Floating Quick Actions Button */}
      <Button
        onClick={() => setQuickActionsOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40 transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
          boxShadow: '0 4px 20px hsla(var(--primary) / 0.4)',
        }}
        aria-label="Quick actions"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Quick Actions Sheet */}
      <QuickActionsSheet 
        open={quickActionsOpen} 
        onOpenChange={setQuickActionsOpen}
      />
    </>
  );
}
