-- Create payment_errors table for structured error logging
CREATE TABLE IF NOT EXISTS payment_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  request_body JSONB,
  stripe_error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_errors_org ON payment_errors(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_errors_action ON payment_errors(action);

-- Enable RLS
ALTER TABLE payment_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all errors
DROP POLICY IF EXISTS "Admins can view payment errors" ON payment_errors;
CREATE POLICY "Admins can view payment errors"
ON payment_errors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Policy: Org owners can view their own errors
DROP POLICY IF EXISTS "Org owners can view own payment errors" ON payment_errors;
CREATE POLICY "Org owners can view own payment errors"
ON payment_errors FOR SELECT
USING (
  org_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  pdf_url TEXT,
  email_sent_at TIMESTAMPTZ,
  email_status TEXT DEFAULT 'not_sent' CHECK (email_status IN ('pending', 'sent', 'failed', 'not_sent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
DROP POLICY IF EXISTS "Org owners can manage invoices" ON invoices;
CREATE POLICY "Org owners can manage invoices"
ON invoices FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- Add next payout date to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS next_payout_date TIMESTAMPTZ;