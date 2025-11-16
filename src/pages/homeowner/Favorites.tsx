import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Loader2, MessageSquare, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface FavoriteProvider {
  provider_org_id: string;
  created_at: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    tagline: string | null;
    verified: boolean;
    rating_avg: number;
    rating_count: number;
  };
}

export default function Favorites() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteProvider[]>([]);
  const [profileId, setProfileId] = useState<string>("");

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      setProfileId(profile.id);

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          provider_org_id,
          created_at,
          organization:organizations!favorites_provider_org_id_fkey (
            id,
            name,
            slug,
            logo_url,
            tagline,
            verified,
            rating_avg,
            rating_count
          )
        `)
        .eq('homeowner_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data as any || []);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (providerId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('homeowner_profile_id', profileId)
        .eq('provider_org_id', providerId);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.provider_org_id !== providerId));
      toast.success("Removed from favorites");
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      toast.error("Failed to remove favorite");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-current text-primary" />
            My Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No favorite providers yet</p>
              <Button onClick={() => navigate('/homeowner/browse')}>
                Browse Providers
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((favorite) => (
                <Card key={favorite.provider_org_id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={favorite.organization.logo_url || undefined} />
                        <AvatarFallback>{favorite.organization.name[0]}</AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveFavorite(favorite.provider_org_id)}
                        className="text-primary"
                      >
                        <Heart className="h-5 w-5 fill-current" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {favorite.organization.name}
                          {favorite.organization.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </h3>
                        {favorite.organization.tagline && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {favorite.organization.tagline}
                          </p>
                        )}
                      </div>

                      {favorite.organization.rating_count > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">
                              {favorite.organization.rating_avg.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            ({favorite.organization.rating_count} reviews)
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/homeowner/provider/${favorite.organization.slug}`)}
                          className="w-full"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}