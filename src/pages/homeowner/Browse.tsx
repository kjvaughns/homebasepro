import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, SlidersHorizontal, Star, Droplet, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FloatingAIAssistant } from "@/components/marketplace/FloatingAIAssistant";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteToggle } from "@/components/homeowner/FavoriteToggle";

export default function Browse() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ["Lawn Care", "Plumbing", "Electrical", "HVAC", "Cleaning"];

  useEffect(() => {
    loadProviders();
    const category = searchParams.get('category');
    if (category) setSelectedCategory(category);
  }, [searchParams]);

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

  const filteredProviders = providers.filter((provider) => {
    const serviceTypes = Array.isArray(provider.service_type) 
      ? provider.service_type 
      : provider.service_type ? [provider.service_type] : [];
    
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      provider.service_area?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
      serviceTypes.some(type => type.toLowerCase() === selectedCategory.toLowerCase());
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/90">
        <div className="px-4 pt-6 pb-8 space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <div className="bg-background rounded-t-[2rem] min-h-[calc(100vh-20rem)] px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-md rounded-2xl">
              <Skeleton className="h-48 w-full rounded-t-2xl" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/90">
      {/* Header Section */}
      <div className="px-4 pt-6 pb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for service or provider"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-base bg-background rounded-2xl border-0 shadow-md"
          />
        </div>

        {/* Location and Date Filters */}
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            className="flex-1 h-12 bg-background hover:bg-background/90 rounded-xl justify-start gap-2 text-base font-normal"
          >
            <MapPin className="h-5 w-5 text-primary" />
            Dallas, TX
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1 h-12 bg-background hover:bg-background/90 rounded-xl justify-start gap-2 text-base font-normal"
          >
            <Calendar className="h-5 w-5 text-primary" />
            Any date
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 items-center overflow-x-auto pb-2 no-scrollbar">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              className={`rounded-full whitespace-nowrap h-10 px-5 ${
                selectedCategory === category 
                  ? "bg-background text-foreground hover:bg-background/90" 
                  : "bg-background/50 text-foreground hover:bg-background/70"
              }`}
            >
              {category === "Lawn Care" && <Droplet className="h-4 w-4 mr-2 text-primary" />}
              {category}
            </Button>
          ))}
          <Button
            variant="default"
            className="rounded-full whitespace-nowrap h-10 px-5 bg-primary hover:bg-primary/90"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-background rounded-t-[2rem] min-h-[calc(100vh-20rem)] px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">Top Providers</h2>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card className="border-0 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No providers found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProviders.map((provider, index) => (
              <Card
                key={provider.id}
                className="cursor-pointer hover:shadow-lg transition-all border-0 shadow-md overflow-hidden rounded-2xl"
                onClick={() => navigate(`/homeowner/browse/${provider.id}`)}
              >
                {/* Provider Image */}
                <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <FavoriteToggle 
                      providerId={provider.id}
                      variant="default"
                      size="icon"
                      className="bg-background hover:bg-background/90 text-foreground rounded-full shadow-lg"
                    />
                    <Button 
                      size="sm" 
                      className="bg-background hover:bg-background/90 text-foreground rounded-full px-6 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Book Now
                    </Button>
                  </div>
                  <div className="text-6xl">
                    {provider.service_type === "Lawn Care" ? "🌱" : 
                     provider.service_type === "Plumbing" ? "🔧" : "⚡"}
                  </div>
                </div>

                {/* Provider Info */}
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-xl font-bold">{provider.name}</h3>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold ml-1">4.{8 - (index % 3)}</span>
                    </div>
                    <span className="text-muted-foreground">
                      ({150 + (index * 50)} reviews)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {Array.isArray(provider.service_type) 
                      ? provider.service_type.map((type: string) => (
                          <Badge key={type} variant="secondary" className="text-sm">
                            {type}
                          </Badge>
                        ))
                      : provider.service_type && (
                          <Badge variant="secondary" className="text-sm">
                            {provider.service_type}
                          </Badge>
                        )
                    }
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <FloatingAIAssistant />
    </div>
  );
}
