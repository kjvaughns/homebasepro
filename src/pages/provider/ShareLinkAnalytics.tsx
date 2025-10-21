import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d"];

export default function ShareLinkAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    unique: 0,
  });
  const [timelineData, setTimelineData] = useState([]);
  const [sourcesData, setSourcesData] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [utmData, setUtmData] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [id]);

  const loadAnalytics = async () => {
    try {
      // Load link details
      const { data: linkData } = await supabase
        .from("short_links")
        .select("*, organizations(name, logo_url)")
        .eq("id", id)
        .single();

      if (!linkData) {
        navigate("/provider/share-links");
        return;
      }
      setLink(linkData);

      // Load clicks
      const { data: clicksData } = await supabase
        .from("short_link_clicks")
        .select("*")
        .eq("short_link_id", id)
        .order("clicked_at", { ascending: false });

      setClicks(clicksData || []);

      // Calculate stats
      const today = new Date().toDateString();
      const todayClicks = clicksData?.filter(
        (c) => new Date(c.clicked_at).toDateString() === today
      ).length || 0;

      const uniqueIPs = new Set(clicksData?.map((c) => c.ip).filter(Boolean));

      setStats({
        total: clicksData?.length || 0,
        today: todayClicks,
        unique: uniqueIPs.size,
      });

      // Process timeline data (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const clicksByDay = {};
      clicksData?.forEach((click) => {
        if (new Date(click.clicked_at) >= thirtyDaysAgo) {
          const day = format(new Date(click.clicked_at), "MMM dd");
          clicksByDay[day] = (clicksByDay[day] || 0) + 1;
        }
      });

      const timeline = Object.entries(clicksByDay).map(([date, clicks]) => ({
        date,
        clicks,
      }));
      setTimelineData(timeline);

      // Process sources
      const sourceCount = {};
      clicksData?.forEach((click) => {
        let source = "Direct";
        if (click.referrer) {
          try {
            source = new URL(click.referrer).hostname;
          } catch (e) {
            source = click.referrer;
          }
        }
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });

      const sources = Object.entries(sourceCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setSourcesData(sources);

      // Process device types
      const deviceCount = {};
      clicksData?.forEach((click) => {
        const device = click.device_type || "Unknown";
        deviceCount[device] = (deviceCount[device] || 0) + 1;
      });

      const devices = Object.entries(deviceCount).map(([name, value]) => ({
        name,
        value,
      }));
      setDeviceData(devices);

      // Process UTM data
      const utmCount = {};
      clicksData?.forEach((click) => {
        if (click.utm_campaign || click.utm_source || click.utm_medium) {
          const key = `${click.utm_campaign || "No Campaign"} / ${
            click.utm_source || "No Source"
          } / ${click.utm_medium || "No Medium"}`;
          utmCount[key] = (utmCount[key] || 0) + 1;
        }
      });

      const utms = Object.entries(utmCount)
        .map(([name, clicks]) => ({ name, clicks }))
        .sort((a, b) => b.clicks - a.clicks);
      setUtmData(utms);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (!link) {
    return <div className="p-6">Link not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/provider/share-links")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Link Analytics</h1>
          <p className="text-muted-foreground">
            app.homebaseproapp.com/l/{link.slug}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Clicks Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.unique}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Clicks Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
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
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourcesData.slice(0, 10).map((source, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm truncate flex-1">{source.name}</span>
                  <Badge variant="secondary">{source.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={deviceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* UTM Campaigns */}
      {utmData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>UTM Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {utmData.map((utm, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">{utm.name}</span>
                  <Badge variant="secondary">{utm.clicks} clicks</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}