import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  MapPin, Star, Phone, Mail, Globe, Calendar, 
  Award, Clock, CheckCircle2, ArrowLeft 
} from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  default_price: number;
  estimated_duration_minutes: number;
  description?: string;
}

interface ProviderProfile {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  hero_image_url?: string;
  service_area?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating_avg?: number;
  rating_count?: number;
  years_in_business?: number;
  license_number?: string;
  insurance_verified?: boolean;
  marketplace_published: boolean;
}

export default function PublicProviderProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    loadProvider();
  }, [slug]);

  const loadProvider = async () => {
    try {
      setLoading(true);

      // First, find the short link and increment views
      const { data: shortLink, error: linkError } = await supabase
        .from("short_links")
        .select("org_id")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (linkError || !shortLink) {
        toast.error("Provider not found");
        navigate("/marketplace");
        return;
      }

      // Increment view count
      await supabase.rpc("increment_short_link_views", { link_slug: slug });

      // Load provider organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", shortLink.org_id)
        .single();

      if (orgError || !org) {
        toast.error("Provider not found");
        navigate("/marketplace");
        return;
      }

      // Check if published
      if (!org.marketplace_published) {
        toast.error("This provider profile is not currently available");
        navigate("/marketplace");
        return;
      }

      setProvider(org);

      // Load services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at");

      setServices(servicesData || []);

      // Load reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles:homeowner_profile_id (full_name)
        `)
        .eq("provider_org_id", org.id)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(5);

      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Error loading provider:", error);
      toast.error("Failed to load provider profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading provider...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 bg-muted">
        {provider.hero_image_url ? (
          <img
            src={provider.hero_image_url}
            alt={provider.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm"
          onClick={() => navigate("/marketplace")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>

      {/* Provider Info */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarImage src={provider.logo_url} alt={provider.name} />
            <AvatarFallback className="text-3xl">
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{provider.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {provider.service_area && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {provider.service_area}
                    </div>
                  )}
                  {provider.rating_avg && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      {provider.rating_avg.toFixed(1)} ({provider.rating_count} reviews)
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {provider.insurance_verified && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Insured
                    </Badge>
                  )}
                  {provider.license_number && (
                    <Badge variant="secondary">
                      <Award className="h-3 w-3 mr-1" />
                      Licensed
                    </Badge>
                  )}
                  {provider.years_in_business && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {provider.years_in_business}+ years
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                className="md:w-auto w-full"
                onClick={() => navigate(`/book/${slug}`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book Now
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* About Section */}
          <div className="md:col-span-2 space-y-6">
            {provider.description && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">About</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {provider.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Services Section */}
            {services.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Services</h2>
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex justify-between items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {service.estimated_duration_minutes} min
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            ${(service.default_price / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">starting at</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Reviews</h2>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-primary text-primary"
                                    : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-medium">
                            {review.profiles?.full_name || "Anonymous"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.review_text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">Contact</h2>
                <div className="space-y-3">
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {provider.phone}
                    </a>
                  )}
                  {provider.email && (
                    <a
                      href={`mailto:${provider.email}`}
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      {provider.email}
                    </a>
                  )}
                  {provider.website && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/book/${slug}`)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Service
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
