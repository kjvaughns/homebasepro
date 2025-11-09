import { useEffect, useRef, useState } from 'react';
import { useDespia } from '@/hooks/useDespia';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { triggerHaptic } = useDespia();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // pixels to pull before triggering refresh

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (refreshing || !containerRef.current) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;

    if (distance > 0 && containerRef.current.scrollTop === 0) {
      setPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      if (distance >= threshold && !refreshing) {
        triggerHaptic('light');
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      triggerHaptic('success');
      
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    
    setPulling(false);
    setPullDistance(0);
    touchStartY.current = 0;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {(pulling || refreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
          style={{ 
            height: `${pullDistance}px`,
            opacity: progress / 100
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className={`h-6 w-6 text-primary ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs text-muted-foreground">
              {refreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      <div 
        className="transition-transform"
        style={{ 
          transform: `translateY(${pulling || refreshing ? pullDistance : 0}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
}
