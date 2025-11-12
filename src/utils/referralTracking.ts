/**
 * Referral tracking system with secure cookie management
 * Sets a 30-day cookie when users click partner referral links
 */

const COOKIE_NAME = 'partner_ref';
const COOKIE_EXPIRY_DAYS = 30;

/**
 * Set referral cookie when user clicks partner link
 */
export function setReferralCookie(referralSlug: string): void {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
  
  document.cookie = `${COOKIE_NAME}=${referralSlug}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
  
  console.log('[ReferralTracking] Cookie set:', referralSlug);
}

/**
 * Get referral slug from cookie
 */
export function getReferralCookie(): string | null {
  const cookies = document.cookie.split(';');
  const referralCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
  
  if (!referralCookie) return null;
  
  const slug = referralCookie.split('=')[1];
  console.log('[ReferralTracking] Cookie retrieved:', slug);
  return slug;
}

/**
 * Clear referral cookie (used after conversion)
 */
export function clearReferralCookie(): void {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure`;
  console.log('[ReferralTracking] Cookie cleared');
}

/**
 * Store referral in sessionStorage as backup
 */
export function storeReferralInSession(referralSlug: string): void {
  sessionStorage.setItem('partner_ref_backup', referralSlug);
}

/**
 * Get referral from sessionStorage backup
 */
export function getReferralFromSession(): string | null {
  return sessionStorage.getItem('partner_ref_backup');
}
