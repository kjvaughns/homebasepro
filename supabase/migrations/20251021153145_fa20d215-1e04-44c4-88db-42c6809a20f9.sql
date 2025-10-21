-- Add unique constraint on ledger_entries.stripe_ref for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_stripe_ref 
ON ledger_entries(stripe_ref) 
WHERE stripe_ref IS NOT NULL;

-- Create refund_requests table for homeowner-initiated refund requests
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  homeowner_profile_id UUID NOT NULL REFERENCES profiles(id),
  provider_org_id UUID NOT NULL REFERENCES organizations(id),
  amount_requested INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, denied
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  notes TEXT
);

-- RLS policies for refund_requests
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can create refund requests"
  ON refund_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = homeowner_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Homeowners can view own requests"
  ON refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = homeowner_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view their refund requests"
  ON refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = provider_org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can process refund requests"
  ON refund_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = provider_org_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Create trigger function to sync booking status when payment status changes
CREATE OR REPLACE FUNCTION sync_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment status changes to 'paid', confirm booking
  IF NEW.status = 'paid' AND NEW.job_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'confirmed',
        payment_captured = TRUE,
        updated_at = NOW()
    WHERE id = NEW.job_id
    AND status != 'canceled'; -- Don't override cancellations
  END IF;
  
  -- When payment is refunded, update booking
  IF NEW.status = 'refunded' AND NEW.job_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'canceled',
        cancellation_reason = 'Payment refunded',
        updated_at = NOW()
    WHERE id = NEW.job_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-sync booking status on payment updates
CREATE TRIGGER sync_booking_on_payment_update
AFTER UPDATE OF status ON payments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_booking_payment_status();