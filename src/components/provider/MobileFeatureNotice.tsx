import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, CheckCircle } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const features = [
  "Clock in/out from anywhere",
  "View your daily schedule",
  "Update job status on the go",
  "Take photos and add notes",
  "Navigate to job locations",
  "Offline access to job details",
];

export function MobileFeatureNotice() {
  const { canInstall, promptInstall } = usePWAInstall();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              Install the Mobile App
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get the full technician experience with our mobile app. Work efficiently in the field with offline access.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {canInstall ? (
              <Button onClick={promptInstall} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Already installed or not available on this device
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
