-- Add fee breakdown columns to invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS stripe_fee_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_to_provider_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received boolean DEFAULT false;

-- Add type column to service_requests for blocking time
ALTER TABLE service_requests 
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'job';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_received ON invoices(received);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(type);