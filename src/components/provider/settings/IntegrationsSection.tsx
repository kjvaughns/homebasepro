import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIntegrationCard } from "@/components/provider/CalendarIntegrationCard";

interface IntegrationsSectionProps {
  organizationId?: string;
}

export function IntegrationsSection({ organizationId }: IntegrationsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Calendar Integration - Only live integration */}
      <CalendarIntegrationCard />

      {/* Other Integrations - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Other Integrations</CardTitle>
            <Badge variant="secondary" className="text-xs">COMING SOON</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            We're building integrations with popular tools:
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                QB
              </div>
              <span>QuickBooks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                Z
              </div>
              <span>Zapier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                MC
              </div>
              <span>Mailchimp</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                S
              </div>
              <span>Slack</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
