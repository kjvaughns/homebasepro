import { useIsMobile } from "./use-mobile";

export function useMobileLayout() {
  const isMobile = useIsMobile();
  
  return {
    isMobile,
    isTablet: false, // Could extend with tablet detection
    isDesktop: !isMobile,
  };
}
