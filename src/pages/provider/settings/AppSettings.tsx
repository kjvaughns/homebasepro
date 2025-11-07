import { PWASettingsCard } from "@/components/pwa/PWASettingsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

export default function AppSettings() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">App Settings</h1>
        <p className="text-muted-foreground">Configure mobile app and notification preferences</p>
      </div>

      <PWASettingsCard />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <CardTitle>Native Mobile Features</CardTitle>
          </div>
          <CardDescription>
            Access advanced native device capabilities powered by Despia Native
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              HomeBase now supports native mobile features including haptic feedback, 
              biometric authentication, background location tracking, contact import, 
              and native sharing capabilities.
            </p>
            <Link to="/provider/settings/native">
              <Button>
                Configure Native Features
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
