import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Home, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Subscriptions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("homeowner_subscriptions")
        .select(`
          *,
          service_plans(name, billing_frequency, price),
          organizations(name, phone, email),
          homes(name, address)
        `)
        .eq("homeowner_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSubscriptions(data || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessageProvider = async (subscription: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("homeowner_profile_id", profile.id)
        .eq("provider_org_id", subscription.provider_org_id)
        .maybeSingle();

      if (existingConv) {
        navigate("/homeowner/messages");
        return;
      }

      // Create new conversation
      const { error } = await supabase
        .from("conversations")
        .insert({
          homeowner_profile_id: profile.id,
          provider_org_id: subscription.provider_org_id,
        });

      if (error) throw error;

      navigate("/homeowner/messages");
    } catch (error) {
      console.error("Error opening conversation:", error);
      toast({
        title: "Error",
        description: "Failed to open conversation",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "canceled":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Services</h1>
          <p className="text-muted-foreground">Manage your active service subscriptions</p>
        </div>
        <Button onClick={() => navigate("/homeowner/browse")}>
          Browse Providers
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active subscriptions</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Browse service providers and subscribe to plans
            </p>
            <Button onClick={() => navigate("/homeowner/browse")}>
              Browse Providers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {subscriptions.map((subscription) => (
            <Card
              key={subscription.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/homeowner/subscriptions/${subscription.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">
                      {subscription.organizations?.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      {subscription.service_plans?.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleMessageProvider(subscription, e)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Badge variant={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center text-sm">
                    <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{subscription.homes?.name}</p>
                      <p className="text-muted-foreground">{subscription.homes?.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        ${(subscription.billing_amount / 100).toFixed(2)}/{subscription.service_plans?.billing_frequency}
                      </p>
                      <p className="text-muted-foreground">
                        {subscription.auto_renew ? "Auto-renews" : "Manual renewal"}
                      </p>
                    </div>
                  </div>
                </div>

                {subscription.next_service_date && (
                  <div className="flex items-center text-sm pt-4 border-t">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      Next service:{" "}
                      {new Date(subscription.next_service_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
