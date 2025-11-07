import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import despia from 'despia-native';

export function useBiometricGate() {
  const requireBiometric = async (action: string): Promise<boolean> => {
    try {
      await despia('bioauth://');
      
      // Biometric auth successful
      try {
        despia('successhaptic://');
      } catch {}
      
      // Log security audit trail
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('security_audit_log').insert({
        user_id: user?.id,
        action,
        method: 'biometric',
        success: true,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      // Biometric auth failed or cancelled
      try {
        despia('errorhaptic://');
      } catch {}
      
      console.error('Biometric authentication error:', error);
      toast.error('Biometric authentication failed');
      
      // Log failed attempt
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('security_audit_log').insert({
        user_id: user?.id,
        action,
        method: 'biometric',
        success: false,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  };

  const isBiometricAvailable = async (): Promise<boolean> => {
    try {
      // Check if biometric is available on device
      const result = await despia('biometric://available');
      return result === true;
    } catch {
      return false;
    }
  };

  return {
    requireBiometric,
    isBiometricAvailable
  };
}
