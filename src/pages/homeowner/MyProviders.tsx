import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MyProviders() {
  const navigate = useNavigate();
  const [currentProviders, setCurrentProviders] = useState<any[]>([]);
  const [pastProviders, setPastProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Load current providers (active subscriptions)
      const { data: currentSubs } = await supabase
        .from("homeowner_subscriptions")
        .select(`
          provider_org_id,
          organizations(id, name, rating_avg, rating_count, logo_url, service_type),
          next_service_date
        `)
        .eq("homeowner_id", profile.id)
        .eq("status", "active");

      setCurrentProviders(currentSubs || []);

      // Load past providers (canceled/completed subscriptions)
      const { data: pastSubs } = await supabase
        .from("homeowner_subscriptions")
        .select(`
          provider_org_id,
          organizations(id, name, rating_avg, rating_count, logo_url, service_type),
          updated_at
        `)
        .eq("homeowner_id", profile.id)
        .in("status", ["canceled", "completed"])
        .order("updated_at", { ascending: false });

      // Dedupe by provider_org_id
      const uniquePast = Array.from(
        new Map(pastSubs?.map(item => [item.provider_org_id, item]) || []).values()
      );
      setPastProviders(uniquePast);
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const ProviderCard = ({ provider, showNextService, showBookAgain }: any) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all"
      onClick={() => navigate(`/homeowner/browse/${provider.organizations.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {provider.organizations.logo_url ? (
              <img src={provider.organizations.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span className="text-2xl">⚡</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{provider.organizations.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 text-sm font-medium">
                  {provider.organizations.rating_avg?.toFixed(1) || 'New'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({provider.organizations.rating_count || 0} reviews)
              </span>
            </div>
            {showNextService && provider.next_service_date && (
              <Badge variant="outline" className="mt-2 bg-primary/10">
                <Calendar className="h-3 w-3 mr-1" />
                Next: {new Date(provider.next_service_date).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/homeowner/messages");
            }}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Message
          </Button>
          {showBookAgain && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/homeowner/browse/${provider.organizations.id}`);
              }}
            >
              Book Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="container max-w-6xl py-6">Loading...</div>;
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Providers</h1>
        <p className="text-muted-foreground">Manage your current and past service providers</p>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current ({currentProviders.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastProviders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentProviders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active service providers</p>
                <Button className="mt-4" onClick={() => navigate("/homeowner/browse")}>
                  Browse Providers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {currentProviders.map((provider) => (
                <ProviderCard key={provider.provider_org_id} provider={provider} showNextService />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastProviders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No past providers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pastProviders.map((provider) => (
                <ProviderCard key={provider.provider_org_id} provider={provider} showBookAgain />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          Looking for favorite providers? Check out your{" "}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/homeowner/favorites")}>
            Favorites page
          </Button>
        </p>
      </Card>
    </div>
  );
}
