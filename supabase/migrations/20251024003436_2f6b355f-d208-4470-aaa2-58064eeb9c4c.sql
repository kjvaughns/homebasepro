-- Add Stripe invoice columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_hosted_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice 
ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;