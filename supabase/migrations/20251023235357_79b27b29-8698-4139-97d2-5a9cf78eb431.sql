-- Phase 1: Database Schema Fixes

-- 1.1 Enhance bookings table with provider workflow columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS route_order INTEGER,
ADD COLUMN IF NOT EXISTS assigned_team_member_id UUID REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS completion_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS lat NUMERIC,
ADD COLUMN IF NOT EXISTS lng NUMERIC,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);

COMMENT ON COLUMN bookings.status IS 
'Lifecycle: lead → quoted → scheduled → confirmed → in_progress → completed → invoiced → paid';

-- 1.2 Enhance invoices table with Stripe Checkout integration
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session ON invoices(stripe_checkout_session_id);

-- 1.3 Enhance payments table - link to invoices and bookings
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id),
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);