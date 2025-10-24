/**
 * Robust clipboard utility with fallback mechanisms
 * Handles browser security restrictions and permission issues
 */

export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: string }> {
  // Method 1: Modern Clipboard API (requires HTTPS and user gesture)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
    }
  }

  // Method 2: Fallback using execCommand (works in more contexts)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (successful) {
      return { success: true };
    } else {
      return { success: false, error: 'Copy command failed' };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
