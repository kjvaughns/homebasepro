import { useRef, useState } from 'react';
import { useDespia } from '@/hooks/useDespia';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: React.ReactNode; label: string; color: string };
  rightAction?: { icon: React.ReactNode; label: string; color: string };
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const { triggerHaptic } = useDespia();
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const threshold = 100; // pixels to swipe before triggering action

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 150;
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setOffset(limitedDiff);

    // Haptic feedback at threshold
    if ((Math.abs(limitedDiff) >= threshold) && Math.abs(offset) < threshold) {
      triggerHaptic('light');
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);

    if (offset <= -threshold && onSwipeLeft) {
      triggerHaptic('success');
      onSwipeLeft();
    } else if (offset >= threshold && onSwipeRight) {
      triggerHaptic('success');
      onSwipeRight();
    }

    setOffset(0);
  };

  const showLeftAction = offset < -50 && leftAction;
  const showRightAction = offset > 50 && rightAction;

  return (
    <div className="relative overflow-hidden">
      {/* Left action background */}
      {showLeftAction && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end px-6 rounded-2xl",
            leftAction.color
          )}
          style={{
            width: `${Math.abs(offset)}px`,
            opacity: Math.min(Math.abs(offset) / threshold, 1),
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {leftAction.icon}
            <span className="text-xs font-medium text-white">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action background */}
      {showRightAction && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start px-6 rounded-2xl",
            rightAction.color
          )}
          style={{
            width: `${offset}px`,
            opacity: Math.min(offset / threshold, 1),
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {rightAction.icon}
            <span className="text-xs font-medium text-white">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Card content */}
      <Card
        className={cn(
          "relative transition-transform touch-pan-y cursor-grab active:cursor-grabbing",
          className
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </Card>
    </div>
  );
}
