import { Button } from '@/components/ui/button';
import { useDespia } from '@/hooks/useDespia';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFABProps {
  icon: LucideIcon;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function MobileFAB({ icon: Icon, onClick, label, className }: MobileFABProps) {
  const { triggerHaptic } = useDespia();

  const handleClick = () => {
    triggerHaptic('light');
    onClick();
  };

  return (
    <Button
      size="lg"
      onClick={handleClick}
      className={cn(
        "fixed right-4 bottom-20 z-50 h-14 w-14 rounded-full shadow-lg",
        "hover:scale-110 active:scale-95 transition-transform",
        "md:hidden", // Only show on mobile
        className
      )}
    >
      <Icon className="h-6 w-6" />
      {label && <span className="sr-only">{label}</span>}
    </Button>
  );
}
