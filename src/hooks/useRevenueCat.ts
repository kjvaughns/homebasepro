import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import despia from 'despia-native';

interface Package {
  identifier: string;
  product: {
    title: string;
    description: string;
    priceString: string;
    price: number;
  };
}

interface Offering {
  id: string;
  packages: Package[];
}

export function useRevenueCat() {
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = async (userId: string) => {
    try {
      const apiKey = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY || '';
      await despia(`revenuecat://configure?apiKey=${encodeURIComponent(apiKey)}&userId=${encodeURIComponent(userId)}`);
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.warn('RevenueCat initialization not available:', error);
      return false;
    }
  };

  const getOfferings = async (): Promise<Offering[]> => {
    try {
      const result = await despia('revenuecat://offerings', ['packages']);
      return (result?.packages as Offering[]) || [];
    } catch (error) {
      console.warn('Get offerings not available:', error);
      return [];
    }
  };

  const purchasePackage = async (packageId: string) => {
    try {
      const result = await despia(`revenuecat://purchase?packageId=${encodeURIComponent(packageId)}`, ['purchaseData']);

      // Sync to backend
      const { error } = await supabase.functions.invoke('sync-revenuecat-purchase', {
        body: { purchaseData: result?.purchaseData }
      });

      if (error) throw error;

      try {
        despia('successhaptic://');
      } catch {}
      toast.success('Subscription activated!');
      
      return result;
    } catch (error) {
      console.error('Purchase error:', error);
      try {
        despia('errorhaptic://');
      } catch {}
      toast.error('Purchase failed');
      throw error;
    }
  };

  const checkEntitlement = async (identifier: string): Promise<boolean> => {
    try {
      const result = await despia(`revenuecat://entitlements?identifier=${encodeURIComponent(identifier)}`, ['isActive']);
      return result?.isActive === true;
    } catch (error) {
      console.warn('Check entitlement not available:', error);
      return false;
    }
  };

  const restorePurchases = async () => {
    try {
      const result = await despia('revenuecat://restore', ['restored']);
      
      if (result?.restored) {
        try {
          despia('successhaptic://');
        } catch {}
        toast.success('Purchases restored successfully');
      } else {
        toast('No purchases to restore');
      }
      
      return result;
    } catch (error) {
      console.warn('Restore purchases not available:', error);
      try {
        despia('errorhaptic://');
      } catch {}
      toast.error('Failed to restore purchases');
      throw error;
    }
  };

  const getCustomerInfo = async () => {
    try {
      const info = await despia('revenuecat://customerInfo', ['customerInfo']);
      return info?.customerInfo;
    } catch (error) {
      console.warn('Get customer info not available:', error);
      return null;
    }
  };

  return {
    initialize,
    getOfferings,
    purchasePackage,
    checkEntitlement,
    restorePurchases,
    getCustomerInfo,
    isInitialized
  };
}

// Auto-initialize RevenueCat for authenticated users
export function useRevenueCatInit() {
  const { initialize } = useRevenueCat();

  useEffect(() => {
    const initRevenueCat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await initialize(user.id);
    };

    initRevenueCat();
  }, []);
}
