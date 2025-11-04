/**
 * Payment validation helpers
 */

export interface PaymentValidationParams {
  amountCents?: number;
  stripeAccountId?: string;
  currency?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate payment request parameters
 */
export function validatePaymentRequest(params: PaymentValidationParams): ValidationResult {
  const errors: string[] = [];

  if (!params.stripeAccountId || params.stripeAccountId.trim() === '') {
    errors.push('Provider must complete Stripe onboarding first. Go to Settings → Payments.');
  }

  if (params.amountCents !== undefined) {
    if (params.amountCents <= 0) {
      errors.push('Amount must be greater than zero');
    }
    
    if (params.amountCents < 50) {
      errors.push('Amount must be at least $0.50 USD (Stripe minimum transaction amount)');
    }
  }

  if (params.currency && params.currency.toLowerCase() !== 'usd') {
    errors.push('Only USD currency is currently supported');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Throw error if validation fails
 */
export function assertValidPayment(params: PaymentValidationParams): void {
  const result = validatePaymentRequest(params);
  if (!result.valid) {
    throw new Error(result.errors.join('; '));
  }
}
