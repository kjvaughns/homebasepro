import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function BookingLinkManager({ organizationId }: { organizationId: string }) {
  const [bookingLink, setBookingLink] = useState<any>(null);
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadBookingLink();
  }, [organizationId]);

  const loadBookingLink = async () => {
    const { data } = await supabase
      .from('provider_booking_links')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (data) {
      setBookingLink(data);
      setSlug(data.slug);
    }
  };

  const handleCreate = async () => {
    if (!slug) {
      toast.error("Please enter a booking link slug");
      return;
    }

    const { error } = await supabase.from('provider_booking_links').insert({
      organization_id: organizationId,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      is_active: true,
    });

    if (error) {
      toast.error("Failed to create booking link: " + error.message);
    } else {
      toast.success("Booking link created!");
      loadBookingLink();
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/book/${bookingLink.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Public Booking Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookingLink ? (
          <>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/book/${bookingLink.slug}`}
                readOnly
              />
              <Button onClick={copyLink} variant="outline" size="icon">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with customers to let them book appointments directly.
            </p>
          </>
        ) : (
          <>
            <Input
              placeholder="your-company-name"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <Button onClick={handleCreate} className="w-full">
              Create Booking Link
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
