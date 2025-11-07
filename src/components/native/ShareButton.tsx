import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { useDespia } from '@/hooks/useDespia';

interface ShareButtonProps {
  message: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareButton({ message, url, variant = 'outline', size = 'default' }: ShareButtonProps) {
  const { shareContent, triggerHaptic } = useDespia();

  const handleShare = () => {
    triggerHaptic('light');
    shareContent(message, url);
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      {size !== 'icon' && <span className="ml-2">Share</span>}
    </Button>
  );
}
