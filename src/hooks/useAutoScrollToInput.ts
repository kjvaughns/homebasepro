import { useEffect } from 'react';

/**
 * Auto-scroll focused input fields into view when keyboard appears
 * Useful for forms and settings pages on mobile
 */
export function useAutoScrollToInput() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT'
      ) {
        // Small delay to let keyboard animation start
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
    };

    // Listen to focus events at document level
    document.addEventListener('focusin', handleFocus);
    
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);
}
