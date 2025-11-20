import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicBookingForm } from "@/components/booking/PublicBookingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  default_price: number;
  estimated_duration_minutes: number;
  description?: string;
}

interface Provider {
  id: string;
  name: string;
  logo_url?: string;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    loadProviderAndServices();
  }, [slug]);

  const loadProviderAndServices = async () => {
    try {
      setLoading(true);

      // Get provider from short link
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

      // Load provider
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("id", shortLink.org_id)
        .single();

      if (orgError || !org) {
        toast.error("Provider not found");
        navigate("/marketplace");
        return;
      }

      setProvider(org);

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at");

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error) {
      console.error("Error loading provider:", error);
      toast.error("Failed to load booking information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading booking form...</p>
        </div>
      </div>
    );
  }

  if (!provider || services.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Services Available</h2>
          <p className="text-muted-foreground mb-4">
            This provider doesn't have any services configured yet.
          </p>
          <Button onClick={() => navigate(`/p/${slug}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/p/${slug}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          {provider.logo_url && (
            <img
              src={provider.logo_url}
              alt={provider.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="font-semibold">{provider.name}</h1>
            <p className="text-sm text-muted-foreground">Request a booking</p>
          </div>
        </div>
      </div>

      <PublicBookingForm
        providerId={provider.id}
        providerName={provider.name}
        services={services}
      />
    </div>
  );
}
