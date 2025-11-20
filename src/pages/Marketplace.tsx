import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, MapPin, Star, Filter, Grid, List,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

interface Provider {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  service_area?: string;
  rating_avg?: number;
  rating_count?: number;
  service_type?: string[];
  slug?: string;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadProviders();
  }, [page, searchTerm]);

  const loadProviders = async () => {
    try {
      setLoading(true);

      // First, get published short links to find valid providers
      const { data: shortLinks } = await supabase
        .from("short_links")
        .select("org_id, slug")
        .eq("is_active", true)
        .eq("is_default", true);

      if (!shortLinks || shortLinks.length === 0) {
        setProviders([]);
        setTotalPages(1);
        return;
      }

      const orgIds = shortLinks.map(link => link.org_id);

      // Build query for organizations
      let query = supabase
        .from("organizations")
        .select("*", { count: "exact" })
        .eq("marketplace_published", true)
        .in("id", orgIds);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Merge with slugs from short_links
      const providersWithSlugs = (data || []).map(provider => ({
        ...provider,
        slug: shortLinks.find(link => link.org_id === provider.id)?.slug
      }));

      setProviders(providersWithSlugs);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error("Error loading providers:", error);
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm) {
      setSearchParams({ q: searchTerm });
    } else {
      setSearchParams({});
    }
  };

  const ProviderCard = ({ provider }: { provider: Provider }) => (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => provider.slug && navigate(`/p/${provider.slug}`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={provider.logo_url} alt={provider.name} />
            <AvatarFallback>
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">{provider.name}</h3>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {provider.rating_avg && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span>{provider.rating_avg.toFixed(1)}</span>
                  {provider.rating_count && (
                    <span className="text-xs">({provider.rating_count})</span>
                  )}
                </div>
              )}
              {provider.service_area && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{provider.service_area}</span>
                </div>
              )}
            </div>

            {provider.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {provider.description}
              </p>
            )}

            {provider.service_type && provider.service_type.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {provider.service_type.slice(0, 3).map((type, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
                {provider.service_type.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{provider.service_type.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <Button 
          className="w-full mt-4" 
          onClick={(e) => {
            e.stopPropagation();
            provider.slug && navigate(`/book/${provider.slug}`);
          }}
        >
          Book Now
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-4">Service Provider Marketplace</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by service, company name, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm
                ? "No providers found matching your search."
                : "No providers available yet. Check back soon!"}
            </p>
          </div>
        ) : (
          <>
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
