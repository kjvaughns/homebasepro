import { useState, useEffect } from 'react';

/**
 * Track iOS keyboard height using VisualViewport API
 * Returns keyboard height in pixels for dynamic padding
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const height = windowHeight - viewportHeight;
        setKeyboardHeight(Math.max(0, height));
      }
    };

    // Initial check
    handleResize();

    // Listen to viewport changes (keyboard open/close)
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardHeight;
}
