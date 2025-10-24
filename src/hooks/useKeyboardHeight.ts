import { useState, useEffect, useRef } from 'react';

/**
 * Track iOS keyboard height using VisualViewport API
 * Returns keyboard height in pixels for dynamic padding
 * Also sets --kb-height CSS variable for optional CSS use
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastHeightRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      // Debounce with requestAnimationFrame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (window.visualViewport) {
          const vv = window.visualViewport;
          const windowHeight = window.innerHeight;
          
          // Calculate keyboard height using viewport height and offsetTop
          const height = Math.max(0, windowHeight - vv.height - vv.offsetTop);
          
          // Only update if change is significant (>4px) to prevent jitter
          if (Math.abs(height - lastHeightRef.current) > 4) {
            lastHeightRef.current = height;
            setKeyboardHeight(height);
            
            // Set CSS variable for optional use
            document.documentElement.style.setProperty('--kb-height', `${height}px`);
          }
        }
      });
    };

    // Initial check
    handleResize();

    // Listen to viewport changes (keyboard open/close)
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardHeight;
}
