import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { useDespia } from '@/hooks/useDespia';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NativeCameraButtonProps {
  onPhotoCapture: (url: string) => void;
  storageBucket: string;
  storagePath: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

export function NativeCameraButton({
  onPhotoCapture,
  storageBucket,
  storagePath,
  variant = 'outline',
  size = 'default',
  label = 'Take Photo'
}: NativeCameraButtonProps) {
  const [uploading, setUploading] = useState(false);
  const { triggerHaptic } = useDespia();

  const handleCapture = async () => {
    setUploading(true);
    triggerHaptic('light');

    try {
      // Create file input dynamically
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          setUploading(false);
          return;
        }

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${storagePath}/${crypto.randomUUID()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(storageBucket)
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from(storageBucket)
            .getPublicUrl(fileName);

          onPhotoCapture(publicUrl);
          triggerHaptic('success');
          toast.success('Photo captured and uploaded');
        } catch (error) {
          console.error('Upload error:', error);
          triggerHaptic('error');
          toast.error('Failed to upload photo');
        } finally {
          setUploading(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('Camera error:', error);
      triggerHaptic('error');
      toast.error('Failed to open camera');
      setUploading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleCapture}
      disabled={uploading}
    >
      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Camera className="h-4 w-4" />
      )}
      {size !== 'icon' && label && (
        <span className="ml-2">{uploading ? 'Uploading...' : label}</span>
      )}
    </Button>
  );
}
