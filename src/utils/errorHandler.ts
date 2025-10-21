/**
 * Error sanitization utilities to prevent internal details from leaking to users
 * SECURITY: Never expose stack traces, database errors, or API keys in user-facing messages
 */

interface ErrorMapping {
  pattern: string | RegExp;
  userMessage: string;
}

const errorMappings: ErrorMapping[] = [
  // Authentication errors
  { pattern: /invalid login credentials/i, userMessage: 'Email or password is incorrect.' },
  { pattern: /user already registered/i, userMessage: 'An account with this email already exists.' },
  { pattern: /email not confirmed/i, userMessage: 'Please verify your email before signing in.' },
  { pattern: /invalid email or password/i, userMessage: 'Email or password is incorrect.' },
  { pattern: /jwt expired/i, userMessage: 'Your session has expired. Please sign in again.' },
  { pattern: /refresh_token_not_found/i, userMessage: 'Your session has expired. Please sign in again.' },
  
  // Network errors
  { pattern: /network request failed/i, userMessage: 'Connection error. Please check your internet and try again.' },
  { pattern: /failed to fetch/i, userMessage: 'Connection error. Please check your internet and try again.' },
  { pattern: /timeout/i, userMessage: 'Request timed out. Please try again.' },
  
  // Payment errors (Stripe)
  { pattern: /stripe account not connected/i, userMessage: 'Payment setup incomplete. Please contact the provider.' },
  { pattern: /card was declined/i, userMessage: 'Your card was declined. Please try a different payment method.' },
  { pattern: /insufficient funds/i, userMessage: 'Insufficient funds. Please try a different payment method.' },
  { pattern: /expired card/i, userMessage: 'Your card has expired. Please use a different payment method.' },
  { pattern: /incorrect cvc/i, userMessage: 'Incorrect security code. Please check your card details.' },
  { pattern: /processing error/i, userMessage: 'Payment processing error. Please try again.' },
  
  // Permission errors
  { pattern: /forbidden/i, userMessage: 'You don\'t have permission to perform this action.' },
  { pattern: /unauthorized/i, userMessage: 'Please sign in to continue.' },
  { pattern: /access denied/i, userMessage: 'Access denied. Please contact support if this is unexpected.' },
  
  // Validation errors
  { pattern: /please fill in all required fields/i, userMessage: 'Please fill in all required fields.' },
  { pattern: /invalid email/i, userMessage: 'Please enter a valid email address.' },
  { pattern: /password must be at least/i, userMessage: 'Password must be at least 6 characters.' },
  
  // Rate limiting
  { pattern: /rate limit/i, userMessage: 'Too many requests. Please wait a moment and try again.' },
  { pattern: /too many attempts/i, userMessage: 'Too many attempts. Please wait 15 minutes and try again.' },
];

/**
 * Sanitize an error to a user-friendly message
 * @param error - The error object or message
 * @returns A safe, user-friendly error message
 */
export const sanitizeError = (error: any): string => {
  // Extract error message from various error formats
  const message = 
    error?.message || 
    error?.error_description || 
    error?.error?.message ||
    error?.toString() || 
    '';
  
  // Check for known error patterns
  for (const mapping of errorMappings) {
    if (typeof mapping.pattern === 'string') {
      if (message.toLowerCase().includes(mapping.pattern.toLowerCase())) {
        return mapping.userMessage;
      }
    } else if (mapping.pattern.test(message)) {
      return mapping.userMessage;
    }
  }
  
  // Generic fallback - never expose internals
  return 'An unexpected error occurred. Please try again or contact support.';
};

/**
 * Log errors for debugging (dev only) or error tracking service
 * @param context - Context identifier (e.g., 'Login', 'PaymentCheckout')
 * @param error - The error object
 */
export const logError = (context: string, error: any) => {
  if (import.meta.env.DEV) {
    // In development, log full details to console
    console.error(`[${context}]`, error);
  } else {
    // In production, log only the message (could integrate Sentry, LogRocket, etc.)
    const message = error?.message || error?.toString() || 'Unknown error';
    console.error(`[${context}]`, message);
    
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(error, { tags: { context } });
  }
};

/**
 * Create a safe error response for display in toast notifications
 * @param context - Context identifier
 * @param error - The error object
 * @returns An object with title and description for toast
 */
export const createSafeErrorToast = (
  context: string,
  error: any
): { title: string; description: string; variant: 'destructive' } => {
  logError(context, error);
  
  return {
    title: `${context} failed`,
    description: sanitizeError(error),
    variant: 'destructive' as const,
  };
};
