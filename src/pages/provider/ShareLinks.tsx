import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, QrCode, BarChart, Trash, Plus, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

export default function ShareLinks() {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [showUtm, setShowUtm] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [clicksData, setClicksData] = useState([]);
  const [topSources, setTopSources] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;
      setOrgId(org.id);
      setOrganization(org);

      // Check for default link, create if doesn't exist
      const { data: defaultLink } = await supabase
        .from("short_links")
        .select("id")
        .eq("org_id", org.id)
        .eq("is_default", true)
        .maybeSingle();

      if (!defaultLink) {
        // Auto-create default short link using org slug
        try {
          await supabase.functions.invoke("short-links-api", {
            body: {
              slug: org.slug,
              org_id: org.id,
              target_url: `${window.location.origin}/homeowner/browse/${org.id}`,
              is_default: true,
            },
          });
        } catch (err) {
          console.error("Error auto-creating default link:", err);
          // Continue even if auto-create fails
        }
      }

      // Load active links with click counts
      const { data: linksData, error } = await supabase
        .from("short_links")
        .select(`
          *,
          organizations(name, logo_url),
          short_link_clicks(count)
        `)
        .eq("org_id", org.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process links with click counts
      const processedLinks = linksData?.map(link => ({
        ...link,
        clicks_count: link.short_link_clicks?.length || 0,
      })) || [];

      setLinks(processedLinks);

      // Load analytics data for last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: clicksData } = await supabase
        .from("short_link_clicks")
        .select("clicked_at, referrer")
        .gte("clicked_at", thirtyDaysAgo.toISOString())
        .in("short_link_id", processedLinks.map(l => l.id));

      // Process clicks by day
      const clicksByDay: Record<string, number> = {};
      clicksData?.forEach(click => {
        const day = format(new Date(click.clicked_at), "MMM dd");
        clicksByDay[day] = (clicksByDay[day] || 0) + 1;
      });

      const chartData = Object.entries(clicksByDay).map(([date, clicks]) => ({
        date,
        clicks,
      }));
      setClicksData(chartData);

      // Process top sources
      const sourceCount: Record<string, number> = {};
      clicksData?.forEach(click => {
        const source = click.referrer ? new URL(click.referrer).hostname : "Direct";
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });

      const topSourcesData = Object.entries(sourceCount)
        .map(([name, clicks]) => ({ name, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
      
      setTopSources(topSourcesData);

    } catch (error) {
      console.error("Error loading links:", error);
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
    setSlugAvailable(null);
  };

  const checkAvailability = async () => {
    if (!slug || slug.length < 3) {
      toast.error("Slug must be at least 3 characters");
      return;
    }

    try {
      const { data } = await supabase.functions.invoke("short-links-api/check-slug/" + slug);
      setSlugAvailable(data.available);
      
      if (!data.available) {
        toast.error(data.reason === 'reserved' ? "This slug is reserved" : "This slug is already taken");
      } else {
        toast.success("Slug is available!");
      }
    } catch (error) {
      console.error("Error checking slug:", error);
      toast.error("Failed to check availability");
    }
  };

  const handleCreateLink = async () => {
    if (!slug || slugAvailable !== true || !orgId) {
      toast.error("Please enter a valid, available slug");
      return;
    }

    setCreating(true);
    try {
      const targetUrl = `https://app.homebaseproapp.com/homeowner/browse/${orgId}`;

      const { data, error } = await supabase.functions.invoke("short-links-api", {
        method: "POST",
        body: {
          org_id: orgId,
          slug,
          target_url: targetUrl,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
        },
      });

      if (error) throw error;

      toast.success("Link created successfully!");
      setSlug("");
      setUtmSource("");
      setUtmMedium("");
      setUtmCampaign("");
      setSlugAvailable(null);
      setShowUtm(false);
      loadData();
    } catch (error) {
      console.error("Error creating link:", error);
      toast.error("Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (linkSlug: string) => {
    const url = `https://app.homebaseproapp.com/l/${linkSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const downloadQR = async (linkId: string, format: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-qr-code/${linkId}?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-code.${format}`;
      a.click();
      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Error downloading QR:", error);
      toast.error("Failed to download QR code");
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const { error } = await supabase.functions.invoke(`short-links-api/${linkId}`, {
        method: "DELETE",
      });

      if (error) throw error;

      toast.success("Link deleted successfully!");
      loadData();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Share Links</h1>
        <p className="text-muted-foreground">
          Create branded short links for easy sharing
        </p>
      </div>

      {/* Create New Link */}
      <Card>
        <CardHeader>
          <CardTitle>Create Booking Link</CardTitle>
          <CardDescription>
            Generate a branded short link for easy sharing on social media, business cards, and marketing materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Custom Slug</Label>
              <div className="flex gap-2 mt-2">
                <span className="flex items-center text-sm text-muted-foreground px-3 bg-muted rounded-l-md border border-r-0">
                  app.homebaseproapp.com/l/
                </span>
                <Input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="your-business-name"
                  pattern="[a-z0-9-]{3,32}"
                  className="rounded-l-none flex-1"
                />
                <Button onClick={checkAvailability} variant="outline">
                  Check
                </Button>
              </div>
              {slugAvailable === true && (
                <p className="text-sm text-green-600 mt-1">✓ Available</p>
              )}
              {slugAvailable === false && (
                <p className="text-sm text-destructive mt-1">✗ Not available</p>
              )}
            </div>

            <Collapsible open={showUtm} onOpenChange={setShowUtm}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Add UTM Parameters (Optional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <Input
                  placeholder="utm_source (e.g. facebook, instagram)"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                />
                <Input
                  placeholder="utm_medium (e.g. social, email)"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                />
                <Input
                  placeholder="utm_campaign (e.g. spring-promo)"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                />
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={handleCreateLink}
              disabled={!slug || slugAvailable !== true || creating}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Links */}
      <Card>
        <CardHeader>
          <CardTitle>Your Active Links ({links.length}/10)</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No links yet. Create your first one above!
            </p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      app.homebaseproapp.com/l/{link.slug}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {link.clicks_count} clicks • Created{" "}
                      {format(new Date(link.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.slug)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4 mr-2" />
                          QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>QR Code</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-qr-code/${link.id}?format=png`}
                            alt="QR Code"
                            className="w-64 h-64"
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => downloadQR(link.id, "png")}>
                              Download PNG
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => downloadQR(link.id, "svg")}
                            >
                              Download SVG
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/provider/share-links/${link.id}/analytics`)
                      }
                    >
                      <BarChart className="h-4 w-4 mr-2" />
                      Stats
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      {clicksData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Link Performance (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={clicksData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>

            {topSources.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Top Sources</h4>
                <div className="space-y-2">
                  {topSources.map((source) => (
                    <div
                      key={source.name}
                      className="flex justify-between py-2 border-b"
                    >
                      <span className="text-sm">{source.name}</span>
                      <Badge variant="secondary">{source.clicks} clicks</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}