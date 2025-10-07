import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Browse() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          service_plans(id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProviders(data || []);
    } catch (error) {
      console.error("Error loading providers:", error);
      toast({
        title: "Error",
        description: "Failed to load service providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.service_area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Service Providers</h1>
        <p className="text-muted-foreground">Find and subscribe to local service providers</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by service type, name, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Providers Grid */}
      {filteredProviders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No providers found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <Card
              key={provider.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/homeowner/browse/${provider.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">{provider.name}</CardTitle>
                    {provider.service_type && (
                      <Badge variant="secondary" className="text-xs">
                        {provider.service_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {provider.description && (
                  <CardDescription className="line-clamp-2">
                    {provider.description}
                  </CardDescription>
                )}
                
                {provider.service_area && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {provider.service_area}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center text-sm">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span className="font-medium">
                      {provider.service_plans?.length || 0} plans available
                    </span>
                  </div>
                  <Button size="sm" variant="outline">
                    View Plans
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
