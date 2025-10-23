import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  affected_features: string[];
}

export const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMaintenance();
  }, []);

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      const settings = data?.value as unknown as MaintenanceSettings;
      if (settings?.enabled) {
        setMaintenance(true);
        setMessage(settings.message || 'System under maintenance');
      }
    } catch (error) {
      console.error('Maintenance check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (maintenance) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Construction className="h-5 w-5 text-primary" />
              <CardTitle>Maintenance Mode</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
