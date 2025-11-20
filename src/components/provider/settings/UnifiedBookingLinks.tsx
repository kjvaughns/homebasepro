import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, QrCode, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface UnifiedBookingLinksProps {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
}

export function UnifiedBookingLinks({ 
  organizationId, 
  organizationSlug,
  organizationName 
}: UnifiedBookingLinksProps) {
  const [shortLink, setShortLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const baseUrl = window.location.origin;
  const bookingUrl = `${baseUrl}/p/${organizationSlug}`;
  const shortLinkUrl = shortLink ? `${baseUrl}/l/${shortLink.slug}` : null;

  useEffect(() => {
    loadShortLink();
  }, [organizationId]);

  const loadShortLink = async () => {
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
      setIsPublic(!!data);
    } catch (error) {
      console.error("Error loading short link:", error);
    } finally {
      setLoading(false);
    }
  };

  const createShortLink = async () => {
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
      setIsPublic(true);
      toast.success("Public profile created!");
    } catch (error: any) {
      console.error("Error creating short link:", error);
      toast.error(error.message || "Failed to create short link");
    } finally {
      setLoading(false);
    }
  };

  const togglePublic = async (checked: boolean) => {
    if (checked && !shortLink) {
      await createShortLink();
    } else {
      setIsPublic(checked);
      toast.success(checked ? "Profile is now public" : "Profile is now private");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard!");
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

  const openProfilePreview = () => {
    if (shortLinkUrl) {
      window.open(shortLinkUrl, '_blank');
    } else {
      window.open(bookingUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Booking & Public Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Public Profile Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="space-y-0.5">
            <Label>Make profile public on HomeBase marketplace</Label>
            <p className="text-xs text-muted-foreground">
              {isPublic ? "✅ Your profile is visible to homeowners" : "🔒 Your profile is private"}
            </p>
          </div>
          <Switch 
            checked={isPublic} 
            onCheckedChange={togglePublic}
            disabled={loading}
          />
        </div>

        {/* Short Link Display */}
        {shortLink && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Short Link</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                  {shortLinkUrl}
                </div>
                <Button 
                  onClick={() => copyToClipboard(shortLinkUrl!)} 
                  variant="outline" 
                  size="icon"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadQR}
                className="flex-1"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openProfilePreview}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
            </div>
          </div>
        )}

        {!shortLink && !loading && (
          <p className="text-sm text-muted-foreground">
            Enable your public profile above to get a short booking link you can share with customers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
