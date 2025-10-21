/**
 * Client-side rate limiter to prevent brute force attacks
 * NOTE: This is defensive only - server-side rate limiting via Supabase Auth is primary defense
 */
class ClientRateLimiter {
  private attempts: Map<string, { count: number; timestamp: number }> = new Map();
  
  /**
   * Check if an attempt is allowed within the rate limit
   * @param key - Unique identifier for the action (e.g., 'login', 'register')
   * @param maxAttempts - Maximum allowed attempts (default: 5)
   * @param windowMs - Time window in milliseconds (default: 15 minutes)
   * @returns true if attempt is allowed, false if rate limited
   */
  canAttempt(key: string, maxAttempts: number = 5, windowMs: number = 900000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    // No previous attempts or window expired - allow and reset
    if (!record || now - record.timestamp > windowMs) {
      this.attempts.set(key, { count: 1, timestamp: now });
      return true;
    }
    
    // Within window but at limit - deny
    if (record.count >= maxAttempts) {
      return false;
    }
    
    // Within window and under limit - allow and increment
    record.count++;
    return true;
  }
  
  /**
   * Reset the attempt counter for a specific key (call after successful auth)
   */
  reset(key: string) {
    this.attempts.delete(key);
  }
  
  /**
   * Get remaining time until rate limit resets
   * @param key - Unique identifier for the action
   * @param windowMs - Time window in milliseconds
   * @returns minutes remaining, or 0 if not rate limited
   */
  getResetMinutes(key: string, windowMs: number = 900000): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    
    const elapsed = Date.now() - record.timestamp;
    const remaining = windowMs - elapsed;
    
    return Math.ceil(remaining / 60000); // Convert to minutes
  }
}

// Singleton instances for different auth flows
export const loginRateLimiter = new ClientRateLimiter();
export const registerRateLimiter = new ClientRateLimiter();
export const adminLoginRateLimiter = new ClientRateLimiter();
