import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, Calendar, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MyProviders() {
  const navigate = useNavigate();
  const [currentProviders, setCurrentProviders] = useState<any[]>([]);
  const [pastProviders, setPastProviders] = useState<any[]>([]);
  const [favoriteProviders, setFavoriteProviders] = useState<any[]>([]);
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

      // Load past providers from both subscriptions and completed bookings
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select(`
          provider_org_id,
          updated_at,
          organizations(id, name, rating_avg, rating_count, logo_url, service_type)
        `)
        .eq('homeowner_profile_id', profile.id)
        .eq('status', 'completed');

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

      // Merge and dedupe providers from both sources
      const allPastProviders = [
        ...(completedBookings || []),
        ...(pastSubs || [])
      ];

      const uniquePast = Array.from(
        new Map(allPastProviders.map(item => [item.provider_org_id, item])).values()
      );
      setPastProviders(uniquePast);

      // Load favorited providers
      const { data: favorites } = await supabase
        .from('favorites')
        .select(`
          provider_org_id,
          created_at,
          organizations(id, name, rating_avg, rating_count, logo_url)
        `)
        .eq('homeowner_profile_id', profile.id);

      setFavoriteProviders(favorites || []);
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (providerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('homeowner_profile_id', profile.id)
        .eq('provider_org_id', providerId);

      if (error) throw error;

      setFavoriteProviders(prev => prev.filter(f => f.provider_org_id !== providerId));
      toast.success("Removed from favorites");
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error("Failed to remove favorite");
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current ({currentProviders.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastProviders.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favoriteProviders.length})</TabsTrigger>
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

        <TabsContent value="favorites" className="space-y-4">
          {favoriteProviders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No favorite providers yet</p>
                <Button onClick={() => navigate("/homeowner/browse")}>
                  Browse Providers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {favoriteProviders.map((favorite) => (
                <Card 
                  key={favorite.provider_org_id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/homeowner/browse/${favorite.organizations.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {favorite.organizations.logo_url ? (
                          <img src={favorite.organizations.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-2xl">⭐</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{favorite.organizations.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="ml-1 text-sm font-medium">
                              {favorite.organizations.rating_avg?.toFixed(1) || 'New'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({favorite.organizations.rating_count || 0} reviews)
                          </span>
                        </div>
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
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.provider_org_id);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-1 fill-current" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
