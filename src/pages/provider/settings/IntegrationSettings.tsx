import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Briefcase, FileText, MessageSquare, Key } from "lucide-react";
import { toast } from "sonner";

interface Integration {
  id: string;
  integration_type: string;
  provider: string;
  is_connected: boolean;
  last_sync_at: string | null;
}

export default function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!org) return;

      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("organization_id", org.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error("Error loading integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const integrationCards = [
    {
      type: "calendar",
      name: "Calendar Sync",
      description: "Connect Google Calendar, Outlook, or Apple Calendar for two-way sync",
      icon: Calendar,
      providers: ["google", "outlook", "apple"],
      comingSoon: true,
    },
    {
      type: "crm",
      name: "CRM Integration",
      description: "Sync clients and jobs with HubSpot, Salesforce, or Pipedrive",
      icon: Briefcase,
      providers: ["hubspot", "salesforce", "pipedrive"],
      comingSoon: true,
    },
    {
      type: "accounting",
      name: "Accounting Software",
      description: "Sync invoices and expenses with QuickBooks or Xero",
      icon: FileText,
      providers: ["quickbooks", "xero"],
      comingSoon: true,
    },
    {
      type: "communication",
      name: "Communication Tools",
      description: "Get notifications in Slack or Microsoft Teams",
      icon: MessageSquare,
      providers: ["slack", "teams"],
      comingSoon: true,
    },
  ];

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect external tools and services</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrationCards.map((integration) => {
          const connected = integrations.find(
            i => i.integration_type === integration.type && i.is_connected
          );

          return (
            <Card key={integration.type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <integration.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  {connected && (
                    <Badge variant="default">Connected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {integration.comingSoon ? (
                  <Button variant="outline" disabled className="w-full">
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    variant={connected ? "outline" : "default"}
                    className="w-full"
                    onClick={() => toast.info("Integration setup coming soon")}
                  >
                    {connected ? "Manage" : "Connect"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>API Access</CardTitle>
          </div>
          <CardDescription>
            Generate API keys for custom integrations and webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
