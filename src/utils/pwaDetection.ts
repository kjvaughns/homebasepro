/**
 * PWA Detection Utility
 * Detects if the app is running in standalone/PWA mode
 * and applies the .standalone class to the HTML element
 */

export const isPWAStandalone = (): boolean => {
  // Check if running in standalone mode (PWA installed)
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  
  return isStandalone;
};

export const initPWADetection = (): void => {
  const isStandalone = isPWAStandalone();
  
  // Apply .standalone class to HTML element if in PWA mode
  if (isStandalone) {
    document.documentElement.classList.add('standalone');
  } else {
    document.documentElement.classList.remove('standalone');
  }
  
  // Listen for display mode changes
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  mediaQuery.addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('standalone');
    } else {
      document.documentElement.classList.remove('standalone');
    }
  });
};
