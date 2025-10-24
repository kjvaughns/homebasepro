// Helper function to log payment errors with updated schema
export async function logPaymentError(
  supabase: any,
  orgId: string | null,
  route: string,
  payload: any,
  errorMessage: string,
  stripeError?: any
) {
  try {
    await supabase.from('payment_errors').insert({
      org_id: orgId,
      route: route,
      payload: payload,
      error: errorMessage,
      stripe_error_details: stripeError ? {
        type: stripeError.type,
        code: stripeError.code,
        decline_code: stripeError.decline_code,
        message: stripeError.message,
        param: stripeError.param,
      } : null,
    });
  } catch (err) {
    console.error('Failed to log payment error:', err);
  }
}
