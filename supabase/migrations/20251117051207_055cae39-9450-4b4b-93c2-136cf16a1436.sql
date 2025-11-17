-- Create trigger to automatically create payment record when booking is completed
CREATE OR REPLACE FUNCTION create_payment_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_stripe_fee numeric;
  v_platform_fee numeric;
  v_total_amount numeric;
BEGIN
  -- Only proceed if status changed to 'completed' and we have a final_price
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.final_price IS NOT NULL THEN
    
    -- Get organization ID
    v_org_id := NEW.provider_org_id;
    
    -- Calculate fees (2.9% Stripe + 2.9% Platform)
    v_stripe_fee := ROUND(NEW.final_price * 0.029);
    v_platform_fee := ROUND(NEW.final_price * 0.029);
    v_total_amount := NEW.final_price + v_stripe_fee + v_platform_fee;
    
    -- Create payment record
    INSERT INTO payments (
      org_id,
      homeowner_id,
      amount,
      stripe_fee_amount,
      platform_fee_amount,
      net_amount,
      status,
      payment_method,
      booking_id,
      description
    ) VALUES (
      v_org_id,
      NEW.homeowner_profile_id,
      v_total_amount,
      v_stripe_fee,
      v_platform_fee,
      NEW.final_price,
      'succeeded',
      'completed_job',
      NEW.id,
      'Payment for ' || NEW.service_name
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_payment_on_completion ON bookings;
CREATE TRIGGER trigger_create_payment_on_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_on_completion();