/**
 * Maps Stripe error codes to user-friendly, actionable messages
 * Helps users understand what went wrong and what to do next
 */
export const getStripeErrorMessage = (error: any): string => {
  const errorCode = error?.code || error?.decline_code;
  
  const errorMessages: Record<string, string> = {
    // Card declined errors
    'card_declined': 'Your card was declined. Please try a different payment method or contact your bank for details.',
    'generic_decline': 'Your card was declined. Please try a different payment method or contact your bank.',
    'insufficient_funds': 'Insufficient funds on this card. Please use a different card or add funds to your account.',
    'lost_card': 'This card has been reported as lost. Please use a different payment method.',
    'stolen_card': 'This card has been reported as stolen. Please use a different payment method.',
    'do_not_honor': 'Your bank declined this transaction. Please contact your bank or try a different card.',
    'do_not_try_again': 'Your bank has blocked this transaction. Please contact your bank or use a different card.',
    
    // Card information errors
    'expired_card': 'Your card has expired. Please use a different card or update your payment method.',
    'incorrect_cvc': 'The security code (CVC) is incorrect. Please check the 3-4 digit code on the back of your card and try again.',
    'incorrect_number': 'The card number is incorrect. Please check your card and try again.',
    'invalid_cvc': 'The security code is invalid. Please check the 3-4 digit code on the back of your card.',
    'invalid_expiry_month': 'The expiration month is invalid. Please check your card details.',
    'invalid_expiry_year': 'The expiration year is invalid. Please check your card details.',
    'invalid_number': 'The card number is invalid. Please check your card and try again.',
    
    // Processing errors
    'processing_error': 'A temporary error occurred while processing your payment. Please try again in a moment.',
    'issuer_not_available': 'Your card issuer is temporarily unavailable. Please try again in a few minutes or use a different card.',
    'try_again_later': 'Payment processing is temporarily unavailable. Please try again in a few minutes.',
    
    // Limit errors
    'approve_with_id': 'Your bank requires additional verification. Please contact your bank to approve this transaction.',
    'call_issuer': 'Your bank requires you to contact them before this transaction can be completed.',
    'card_velocity_exceeded': 'This card has exceeded its usage limit. Please try again later or use a different card.',
    'withdrawal_count_limit_exceeded': 'Transaction limit exceeded. Please wait 24 hours or use a different payment method.',
    
    // Account errors
    'card_not_supported': 'This type of card is not supported. Please use a different payment method.',
    'currency_not_supported': 'This card does not support the payment currency. Please use a different card.',
    'duplicate_transaction': 'This appears to be a duplicate transaction. If you were charged twice, please contact support.',
    'fraudulent': 'This transaction was flagged for potential fraud. Please contact your bank or try a different card.',
    'merchant_blacklist': 'Your card cannot be used for this transaction. Please use a different payment method.',
    'pickup_card': 'Your bank has requested that you contact them. Please call your bank or use a different card.',
    'restricted_card': 'This card has restrictions that prevent this transaction. Please use a different payment method.',
    'revocation_of_all_authorizations': 'All authorizations on this card have been revoked. Please use a different payment method.',
    'revocation_of_authorization': 'Authorization has been revoked. Please use a different payment method.',
    'security_violation': 'A security violation was detected. Please contact your bank or try a different card.',
    
    // 3D Secure errors
    'authentication_required': 'Additional authentication is required. Please try again and complete the verification step.',
    'card_declined_authentication_required': 'Your bank requires additional authentication. Please try again to complete verification.',
    
    // Network errors
    'testmode_decline': 'This is a test card and cannot be used for real payments. Please use a valid payment method.',
    'rate_limit': 'Too many payment attempts. Please wait a moment and try again.',
  };
  
  // Return mapped message or generic fallback
  return errorMessages[errorCode] || 
    'Payment failed. Please check your payment details and try again, or use a different payment method.';
};

/**
 * Get user-friendly title for error toasts
 */
export const getStripeErrorTitle = (error: any): string => {
  const errorCode = error?.code || error?.decline_code;
  
  if (errorCode?.includes('declined') || errorCode?.includes('insufficient')) {
    return 'Card Declined';
  }
  if (errorCode?.includes('incorrect') || errorCode?.includes('invalid')) {
    return 'Invalid Card Information';
  }
  if (errorCode?.includes('expired')) {
    return 'Card Expired';
  }
  if (errorCode?.includes('processing') || errorCode?.includes('issuer_not_available')) {
    return 'Processing Error';
  }
  
  return 'Payment Failed';
};
