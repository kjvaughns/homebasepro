import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ShortLinkRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    handleRedirect();
  }, [slug]);

  const handleRedirect = async () => {
    if (!slug) {
      navigate("/404");
      return;
    }

    try {
      // Get link details
      const { data: link, error } = await supabase
        .from("short_links")
        .select("*, organizations(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !link) {
        navigate("/404");
        return;
      }

      setProvider(link.organizations);

      // Build target URL with UTMs if present
      const targetUrl = new URL(link.target_url);
      const searchParams = new URLSearchParams(window.location.search);
      
      const utmSource = searchParams.get("utm_source") || link.utm_source;
      const utmMedium = searchParams.get("utm_medium") || link.utm_medium;
      const utmCampaign = searchParams.get("utm_campaign") || link.utm_campaign;

      if (utmSource) targetUrl.searchParams.set("utm_source", utmSource);
      if (utmMedium) targetUrl.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) targetUrl.searchParams.set("utm_campaign", utmCampaign);

      // Track click via edge function
      await supabase.functions.invoke("short-link-redirect", {
        body: { slug },
      });

      // Redirect after short delay (for social preview rendering)
      setTimeout(() => {
        window.location.href = targetUrl.toString();
      }, 500);
    } catch (error) {
      console.error("Error handling redirect:", error);
      navigate("/404");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
      {provider && (
        <div className="text-center space-y-4 p-8">
          {provider.logo_url && (
            <img
              src={provider.logo_url}
              alt={provider.name}
              className="w-24 h-24 mx-auto rounded-full object-cover bg-background"
            />
          )}
          <h1 className="text-2xl font-bold">{provider.name}</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <p className="text-muted-foreground">Redirecting to booking page...</p>
        </div>
      )}
    </div>
  );
}