import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home as HomeIcon, MapPin, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Homes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomes();
  }, []);

  const loadHomes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("homes")
        .select(`
          *,
          homeowner_subscriptions(count)
        `)
        .eq("owner_id", profile.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHomes(data || []);
    } catch (error) {
      console.error("Error loading homes:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold tracking-tight">My Properties</h1>
          <p className="text-muted-foreground">Manage your homes and properties</p>
        </div>
        <Button onClick={() => navigate("/homeowner/homes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {homes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HomeIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Add your first property to start managing services
            </p>
            <Button onClick={() => navigate("/homeowner/homes/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {homes.map((home) => (
            <Card
              key={home.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/homeowner/homes/${home.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {home.name}
                      {home.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Primary
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {home.city}, {home.state}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{home.address}</p>
                  {home.property_type && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {home.property_type}
                    </p>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <span className="font-medium">Active Services:</span>{" "}
                      {home.homeowner_subscriptions?.[0]?.count || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
