import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PublicProfileCardProps {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  organizationLogo?: string;
}

export function PublicProfileCard({ 
  organizationId, 
  organizationSlug,
  organizationName,
  organizationLogo 
}: PublicProfileCardProps) {
  const [shortLink, setShortLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;
  const bookingUrl = `${baseUrl}/homeowner/browse/${organizationId}`;
  const shortLinkUrl = shortLink ? `${baseUrl}/l/${shortLink.slug}` : null;

  useEffect(() => {
    loadDefaultShortLink();
  }, [organizationId]);

  const loadDefaultShortLink = async () => {
    try {
      const { data, error } = await supabase
        .from("short_links")
        .select("*")
        .eq("org_id", organizationId)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setShortLink(data);
    } catch (error) {
      console.error("Error loading default short link:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultShortLink = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("short-links-api", {
        body: {
          slug: organizationSlug,
          org_id: organizationId,
          target_url: bookingUrl,
          is_default: true,
        },
      });

      if (error) throw error;
      
      setShortLink(data);
      toast.success("Default short link created!");
    } catch (error: any) {
      console.error("Error creating default short link:", error);
      toast.error(error.message || "Failed to create short link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const downloadQR = async () => {
    if (!shortLink) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-qr-code", {
        body: { 
          url: shortLinkUrl,
          format: "png"
        },
      });

      if (error) throw error;

      const link = document.createElement("a");
      link.href = `data:image/png;base64,${data.qrCode}`;
      link.download = `${organizationSlug}-qr-code.png`;
      link.click();
      
      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Error downloading QR:", error);
      toast.error("Failed to download QR code");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Your Booking Links
          </CardTitle>
          <CardDescription>
            Share these links with potential customers to book your services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Booking URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Full Booking URL</label>
              <Badge variant="outline">Primary</Badge>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={bookingUrl}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(bookingUrl, "Booking URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(bookingUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Short Link */}
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading short link...</div>
          ) : shortLink ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Short Link</label>
                <Badge>Default</Badge>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortLinkUrl}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(shortLinkUrl!, "Short link")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadQR}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(shortLinkUrl!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Short Link</label>
              <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  No short link created yet. Create one to get a shareable branded link.
                </p>
                <Button onClick={createDefaultShortLink}>
                  Create Short Link
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button variant="outline" className="w-full" asChild>
              <a href="/provider/share-links">
                <Share2 className="h-4 w-4 mr-2" />
                Manage All Share Links & Analytics
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Preview</CardTitle>
          <CardDescription>
            How your organization appears in the marketplace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            {organizationLogo && (
              <img
                src={organizationLogo}
                alt={organizationName}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{organizationName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your full profile details are displayed on the booking page
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
