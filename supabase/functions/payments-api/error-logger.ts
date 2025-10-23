// Helper function to log payment errors
export async function logPaymentError(
  supabase: any,
  orgId: string,
  action: string,
  message: string,
  requestBody: any,
  stripeError?: any
) {
  try {
    await supabase.from('payment_errors').insert({
      org_id: orgId,
      action: action,
      error_code: stripeError?.code || null,
      error_message: message,
      request_body: requestBody,
      stripe_error_details: stripeError ? {
        type: stripeError.type,
        code: stripeError.code,
        decline_code: stripeError.decline_code,
        message: stripeError.message,
      } : null,
    });
  } catch (err) {
    console.error('Failed to log payment error:', err);
  }
}
