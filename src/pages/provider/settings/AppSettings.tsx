import { PWASettingsCard } from "@/components/pwa/PWASettingsCard";

export default function AppSettings() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">App Settings</h1>
        <p className="text-muted-foreground">Configure mobile app and notification preferences</p>
      </div>

      <PWASettingsCard />
    </div>
  );
}
