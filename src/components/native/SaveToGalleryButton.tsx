import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useDespia } from '@/hooks/useDespia';
import { toast } from 'sonner';

interface SaveToGalleryButtonProps {
  imageUrl: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
  showIcon?: boolean;
}

export function SaveToGalleryButton({ 
  imageUrl, 
  variant = 'outline', 
  size = 'sm',
  label = 'Save',
  showIcon = true 
}: SaveToGalleryButtonProps) {
  const { saveImage, triggerHaptic } = useDespia();

  const handleSave = () => {
    try {
      saveImage(imageUrl);
      triggerHaptic('success');
      toast.success('Image saved to gallery');
    } catch (error) {
      triggerHaptic('error');
      toast.error('Failed to save image');
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleSave}>
      {showIcon && <Download className="h-4 w-4" />}
      {size !== 'icon' && label && <span className={showIcon ? "ml-2" : ""}>{label}</span>}
    </Button>
  );
}
