import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint } from 'lucide-react';
import { useDespia } from '@/hooks/useDespia';
import { toast } from 'sonner';

interface BiometricAuthButtonProps {
  onSuccess: () => void;
  onError?: () => void;
}

export function BiometricAuthButton({ onSuccess, onError }: BiometricAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const { authenticateBiometric, triggerHaptic } = useDespia();

  const handleAuth = async () => {
    setLoading(true);
    try {
      const success = await authenticateBiometric();
      if (success) {
        triggerHaptic('success');
        toast.success('Authentication successful');
        onSuccess();
      } else {
        triggerHaptic('error');
        toast.error('Authentication failed');
        onError?.();
      }
    } catch (error) {
      triggerHaptic('error');
      toast.error('Biometric authentication not available');
      onError?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleAuth}
      disabled={loading}
      className="w-full"
    >
      <Fingerprint className="mr-2 h-4 w-4" />
      {loading ? 'Authenticating...' : 'Use Biometric Authentication'}
    </Button>
  );
}
