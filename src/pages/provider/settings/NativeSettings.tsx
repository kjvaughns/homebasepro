import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDespia } from '@/hooks/useDespia';
import { toast } from 'sonner';
import { Smartphone, Fingerprint, Vibrate, MapPin, Info } from 'lucide-react';

export default function NativeSettings() {
  const [appVersion, setAppVersion] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const despia = useDespia();

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    const version = await despia.getAppVersion();
    if (version) {
      setAppVersion(`${version.versionNumber} (${version.bundleNumber})`);
    }

    const id = await despia.getDeviceId();
    if (id) {
      setDeviceId(id);
    }
  };

  const testHaptics = async () => {
    despia.triggerHaptic('light');
    await new Promise(resolve => setTimeout(resolve, 200));
    despia.triggerHaptic('heavy');
    await new Promise(resolve => setTimeout(resolve, 200));
    despia.triggerHaptic('success');
    toast.success('Haptic feedback test complete');
  };

  const testBiometrics = async () => {
    const success = await despia.authenticateBiometric();
    if (success) {
      despia.triggerHaptic('success');
      toast.success('Biometric authentication successful');
    } else {
      despia.triggerHaptic('error');
      toast.error('Biometric authentication failed');
    }
  };

  const enableLocationTracking = () => {
    despia.enableBackgroundLocation();
    despia.triggerHaptic('success');
    toast.success('Background location enabled for job tracking');
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Native Features</h1>
        <p className="text-muted-foreground">
          Configure native mobile app features powered by Despia Native
        </p>
      </div>

      <div className="grid gap-6">
        {/* App Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>App Information</CardTitle>
            </div>
            <CardDescription>
              Device and app details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">App Version</span>
              <Badge variant="secondary">{appVersion || 'Loading...'}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Device ID</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {deviceId ? deviceId.slice(0, 16) + '...' : 'Loading...'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Haptic Feedback */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Vibrate className="h-5 w-5" />
              <CardTitle>Haptic Feedback</CardTitle>
            </div>
            <CardDescription>
              Tactile feedback for user interactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Haptic feedback is automatically enabled for all buttons and important actions.
              Test different feedback types:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => despia.triggerHaptic('light')}
              >
                Light
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => despia.triggerHaptic('heavy')}
              >
                Heavy
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => despia.triggerHaptic('success')}
              >
                Success
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => despia.triggerHaptic('warning')}
              >
                Warning
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => despia.triggerHaptic('error')}
              >
                Error
              </Button>
            </div>
            <Button onClick={testHaptics}>Test All Haptics</Button>
          </CardContent>
        </Card>

        {/* Biometric Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              <CardTitle>Biometric Authentication</CardTitle>
            </div>
            <CardDescription>
              Face ID, Touch ID, and fingerprint authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable biometric authentication for quick and secure login. Available on the login page.
            </p>
            <Button onClick={testBiometrics}>Test Biometric Auth</Button>
          </CardContent>
        </Card>

        {/* Location Services */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Location Services</CardTitle>
            </div>
            <CardDescription>
              Background location for job tracking and route optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Enable background location to automatically track your location while en route to jobs.
                  This helps with accurate time tracking and route optimization.
                </p>
              </div>
            </div>
            <Button onClick={enableLocationTracking}>Enable Background Location</Button>
          </CardContent>
        </Card>

        {/* Safe Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Safe Area Support</CardTitle>
            <CardDescription>
              Automatic padding for device notches and system UI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Safe area insets are automatically applied to ensure content doesn't overlap with device notches,
              status bars, or home indicators. This provides a better viewing experience across all devices.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
