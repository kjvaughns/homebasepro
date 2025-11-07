import { useEffect } from 'react';
import { useDespia } from '@/hooks/useDespia';

interface FullScreenWrapperProps {
  enabled: boolean;
  children: React.ReactNode;
}

export function FullScreenWrapper({ enabled, children }: FullScreenWrapperProps) {
  const { enableFullScreen } = useDespia();

  useEffect(() => {
    enableFullScreen(enabled);

    return () => {
      // Restore normal mode on unmount
      enableFullScreen(false);
    };
  }, [enabled, enableFullScreen]);

  return <>{children}</>;
}
