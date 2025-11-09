import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDespia } from "@/hooks/useDespia";
import {
  Settings,
  HelpCircle,
  MessageSquare,
  Megaphone,
  DollarSign,
  Briefcase,
  Users,
  TrendingUp,
  LogOut,
  Plus,
  ArrowRight
} from "lucide-react";
import { QuickActionsSheet } from "@/components/provider/QuickActionsSheet";

export default function More() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const { triggerHaptic } = useDespia();

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
    triggerHaptic('light');
    await supabase.auth.signOut();
    navigate('/');
  };

  const businessHubItems = [
    {
      icon: DollarSign,
      title: "Payments & Balance",
      description: "View earnings and manage payouts",
      href: "/provider/money",
      color: "text-emerald-600"
    },
    {
      icon: Briefcase,
      title: "Jobs & Work Orders",
      description: "Manage your service schedule",
      href: "/provider/schedule",
      color: "text-blue-600"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Manage your team members",
      href: "/provider/team",
      color: "text-purple-600"
    },
    {
      icon: TrendingUp,
      title: "Analytics",
      description: "View business insights",
      href: "/provider/analytics",
      color: "text-orange-600"
    }
  ];

  const supportItems = [
    {
      icon: Settings,
      title: "Settings",
      description: "Manage profile, billing & integrations",
      href: "/provider/settings",
      color: "text-gray-600"
    },
    {
      icon: HelpCircle,
      title: "Help Center",
      description: "Get help and support",
      href: "https://docs.homebase.pro",
      external: true,
      color: "text-green-600"
    },
    {
      icon: MessageSquare,
      title: "Contact Support",
      description: "Chat with our team",
      onClick: () => {
        triggerHaptic('light');
        window.Intercom && window.Intercom('show');
      },
      color: "text-orange-600"
    },
    {
      icon: Megaphone,
      title: "Product Updates",
      description: "See what's new",
      href: "/announcements",
      color: "text-pink-600"
    }
  ];

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-6 pb-20">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">More</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {organization?.name || "Your business"}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Hub</CardTitle>
              <CardDescription>Core business operations</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {businessHubItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all group min-h-[60px]"
                  onClick={() => triggerHaptic('light')}
                >
                  <div className={`p-3 rounded-lg bg-accent/20 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
              <CardDescription>Help and configuration</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {supportItems.map((item, index) => (
                item.external ? (
                  <a
                    key={index}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all group min-h-[60px]"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className={`p-3 rounded-lg bg-accent/20 ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                ) : item.onClick ? (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all group min-h-[60px] text-left w-full"
                  >
                    <div className={`p-3 rounded-lg bg-accent/20 ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ) : (
                  <Link
                    key={index}
                    to={item.href!}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all group min-h-[60px]"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className={`p-3 rounded-lg bg-accent/20 ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                )
              ))}
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => {
            triggerHaptic('light');
            setQuickActionsOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <QuickActionsSheet 
        open={quickActionsOpen}
        onOpenChange={setQuickActionsOpen}
      />
    </div>
  );
}
