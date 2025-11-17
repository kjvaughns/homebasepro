-- Phase 1: Fix Data Structure & Status Workflow

-- 1.1 Add platform fee to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0;

-- 1.2 Update payment creation trigger to include platform fees
CREATE OR REPLACE FUNCTION create_payment_on_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_amount INTEGER;
  v_stripe_fee INTEGER;
  v_platform_fee INTEGER;
  v_net INTEGER;
BEGIN
  -- Only proceed if status changed to 'completed' or 'paid'
  IF (NEW.status IN ('completed', 'paid') AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'paid'))) THEN
    
    -- Get organization ID
    v_org_id := NEW.provider_org_id;
    
    -- Calculate amount (use final_price if available, otherwise estimated)
    v_amount := COALESCE(NEW.final_price, (NEW.estimated_price_high + NEW.estimated_price_low) / 2, 0);
    
    -- Calculate Stripe fee (2.9% + 30 cents)
    v_stripe_fee := ROUND(v_amount * 0.029) + 30;
    
    -- Calculate platform fee (2.9%)
    v_platform_fee := ROUND(v_amount * 0.029);
    
    -- Calculate net amount
    v_net := v_amount - v_stripe_fee - v_platform_fee;
    
    -- Insert payment record if amount > 0
    IF v_amount > 0 THEN
      INSERT INTO payments (
        org_id,
        type,
        status,
        amount,
        fee_amount,
        platform_fee_cents,
        net_amount,
        currency,
        payment_date,
        captured,
        meta,
        customer_email,
        customer_name
      ) VALUES (
        v_org_id,
        'booking_completion',
        'paid',
        v_amount,
        v_stripe_fee,
        v_platform_fee,
        v_net,
        'usd',
        NOW(),
        true,
        jsonb_build_object(
          'booking_id', NEW.id,
          'service_name', NEW.service_name,
          'address', NEW.address
        ),
        (SELECT email FROM profiles WHERE id = NEW.homeowner_profile_id),
        (SELECT full_name FROM profiles WHERE id = NEW.homeowner_profile_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_payment_on_booking_completion ON bookings;

-- Create new trigger
CREATE TRIGGER trigger_create_payment_on_booking_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_on_booking_completion();

-- 1.3 Normalize existing booking statuses and create historical payments
DO $$
DECLARE
  booking_record RECORD;
  v_amount INTEGER;
  v_stripe_fee INTEGER;
  v_platform_fee INTEGER;
  v_net INTEGER;
BEGIN
  -- Create payments for completed bookings that don't have them
  FOR booking_record IN 
    SELECT b.* 
    FROM bookings b
    WHERE b.status IN ('completed', 'paid', 'confirmed')
    AND b.final_price > 0
    AND NOT EXISTS (
      SELECT 1 FROM payments p 
      WHERE (p.meta->>'booking_id')::uuid = b.id
    )
  LOOP
    -- Calculate fees
    v_amount := booking_record.final_price;
    v_stripe_fee := ROUND(v_amount * 0.029) + 30;
    v_platform_fee := ROUND(v_amount * 0.029);
    v_net := v_amount - v_stripe_fee - v_platform_fee;
    
    -- Insert historical payment
    INSERT INTO payments (
      org_id,
      type,
      status,
      amount,
      fee_amount,
      platform_fee_cents,
      net_amount,
      currency,
      payment_date,
      captured,
      meta,
      customer_email,
      customer_name,
      created_at
    ) VALUES (
      booking_record.provider_org_id,
      'booking_completion',
      'paid',
      v_amount,
      v_stripe_fee,
      v_platform_fee,
      v_net,
      'usd',
      COALESCE(booking_record.updated_at, booking_record.created_at),
      true,
      jsonb_build_object(
        'booking_id', booking_record.id,
        'service_name', booking_record.service_name,
        'address', booking_record.address,
        'backfilled', true
      ),
      (SELECT email FROM profiles WHERE id = booking_record.homeowner_profile_id),
      (SELECT full_name FROM profiles WHERE id = booking_record.homeowner_profile_id),
      booking_record.created_at
    );
  END LOOP;
END $$;

-- 1.4 Add client status field for pipeline management
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'lead';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_clients_pipeline_status ON clients(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_clients_organization_status ON clients(organization_id, pipeline_status);