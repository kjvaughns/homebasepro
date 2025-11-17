import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDespia } from "@/hooks/useDespia";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Settings,
  HelpCircle,
  MessageSquare,
  LogOut,
  ArrowRight,
  User
} from "lucide-react";

export default function More() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const menuItems = [
    {
      icon: User,
      title: "Profile",
      description: "Manage your personal information",
      href: "/provider/settings",
      color: "text-blue-600"
    },
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
      href: "https://intercom.help/homebase-6429d3414518/en",
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
          <h1 className="text-2xl font-bold mb-1">More</h1>
          <p className="text-muted-foreground">
            {organization?.name || 'Settings & Support'}
          </p>
        </div>

        <div className="space-y-4">
          {/* Role Switcher - Mobile Only */}
          {isMobile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Switch Profile</CardTitle>
                <CardDescription>Toggle between Homeowner and Provider views</CardDescription>
              </CardHeader>
              <CardContent>
                <RoleSwitcher />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings & Support</CardTitle>
              <CardDescription>Manage your account and get help</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {menuItems.map((item) => (
                item.onClick ? (
                  <button
                    key={item.title}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group text-left"
                  >
                    <div className={`w-10 h-10 rounded-full bg-accent flex items-center justify-center ${item.color}`}>
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
                    key={item.title}
                    to={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className={`w-10 h-10 rounded-full bg-accent flex items-center justify-center ${item.color}`}>
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
    </div>
  );
}
