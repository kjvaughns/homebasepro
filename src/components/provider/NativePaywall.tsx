import { useState, useEffect } from 'react';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface NativePaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entitlement: string;
  onPurchase?: () => void;
}

const entitlementFeatures: Record<string, string[]> = {
  unlimited_clients: [
    'Unlimited client accounts',
    'Advanced client management',
    'Client lifetime value tracking',
    'Custom client tags'
  ],
  advanced_analytics: [
    'Revenue analytics dashboard',
    'Job performance metrics',
    'Client retention insights',
    'Custom reports'
  ],
  priority_support: [
    '24/7 priority support',
    'Dedicated account manager',
    'Direct phone support',
    'Feature requests priority'
  ],
  team_access: [
    'Multiple team members',
    'Role-based permissions',
    'Team scheduling',
    'Team performance tracking'
  ]
};

export function NativePaywall({ open, onOpenChange, entitlement, onPurchase }: NativePaywallProps) {
  const { getOfferings, purchasePackage, restorePurchases } = useRevenueCat();
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (open) {
      loadOfferings();
    }
  }, [open]);

  const loadOfferings = async () => {
    setLoading(true);
    try {
      const data = await getOfferings();
      setOfferings(data);
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: any) => {
    setPurchasing(true);
    try {
      await purchasePackage(pkg.identifier);
      onPurchase?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      onPurchase?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const features = entitlementFeatures[entitlement] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Unlock {entitlement.replace(/_/g, ' ')} and more powerful features
          </DialogDescription>
        </DialogHeader>

        {features.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">What you'll get:</h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading plans...</div>
        ) : (
          <div className="grid gap-4">
            {offerings.map((offering) =>
              offering.packages?.map((pkg: any) => (
                <Card key={pkg.identifier} className="border-2 hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle>{pkg.product.title}</CardTitle>
                    <CardDescription>{pkg.product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-3xl font-bold">{pkg.product.priceString}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <Button
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing}
                        size="lg"
                      >
                        {purchasing ? 'Processing...' : 'Subscribe'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button variant="link" onClick={handleRestore}>
            Restore Purchases
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
