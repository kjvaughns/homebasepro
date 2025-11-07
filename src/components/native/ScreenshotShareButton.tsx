import { Button } from '@/components/ui/button';
import { Share2, Camera } from 'lucide-react';
import { useDespia } from '@/hooks/useDespia';
import { toast } from 'sonner';

interface ScreenshotShareButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

export function ScreenshotShareButton({ 
  variant = 'outline', 
  size = 'default',
  label = 'Share Screenshot'
}: ScreenshotShareButtonProps) {
  const { takeScreenshot, triggerHaptic } = useDespia();

  const handleScreenshot = () => {
    try {
      takeScreenshot();
      triggerHaptic('light');
      toast.success('Screenshot captured! Check your gallery.');
    } catch (error) {
      triggerHaptic('error');
      toast.error('Screenshot not available');
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleScreenshot}>
      <Camera className="h-4 w-4" />
      {size !== 'icon' && label && <span className="ml-2">{label}</span>}
    </Button>
  );
}
