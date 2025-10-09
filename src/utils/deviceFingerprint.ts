/**
 * Generate a device fingerprint using various browser and device characteristics
 * This is used for anti-fraud detection in the referral system
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen resolution
  components.push(`${window.screen.width}x${window.screen.height}`);
  components.push(`${window.screen.colorDepth}`);

  // Timezone
  components.push(`${new Date().getTimezoneOffset()}`);

  // User agent
  components.push(navigator.userAgent);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(`${navigator.hardwareConcurrency || 0}`);

  // Device memory (if available)
  if ('deviceMemory' in navigator) {
    components.push(`${(navigator as any).deviceMemory}`);
  }

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('HomeBase 🏠', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('HomeBase 🏠', 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    // Canvas fingerprinting might be blocked
    components.push('canvas-blocked');
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {
    components.push('webgl-blocked');
  }

  // Combine all components and hash
  const fingerprint = components.join('|');
  return await hashString(fingerprint);
}

/**
 * Simple hash function using SubtleCrypto API
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
