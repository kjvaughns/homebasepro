-- Phase 1: Extend organizations for Stripe Connect
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Phase 2: Enhance payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('invoice','payment_link','pos','subscription','refund','deposit')) DEFAULT 'invoice',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS url text,
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Update existing status column to support new values
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
CHECK (status IN ('draft','open','paid','void','uncollectible','refunded','disputed','lost','pending','completed'));

-- Add org_id to existing payments (link via client_subscription -> client -> organization)
UPDATE payments p
SET org_id = c.organization_id
FROM client_subscriptions cs
JOIN clients c ON c.id = cs.client_id
WHERE p.client_subscription_id = cs.id AND p.org_id IS NULL;

-- Phase 3: Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payout_id text UNIQUE,
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  arrival_date timestamptz,
  status text,
  created_at timestamptz DEFAULT now()
);

-- Phase 4: Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  stripe_dispute_id text UNIQUE,
  charge_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  status text,
  reason text,
  due_by timestamptz,
  evidence jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_org_id ON payouts(org_id);
CREATE INDEX IF NOT EXISTS idx_disputes_org_id ON disputes(org_id);

-- RLS Policies for payouts
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization payouts"
ON payouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = payouts.org_id
    AND organizations.owner_id = auth.uid()
  )
);

-- RLS Policies for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization disputes"
ON disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = disputes.org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their organization disputes"
ON disputes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = disputes.org_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Update payments RLS to include org_id access
CREATE POLICY "Users can view their organization payments"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = payments.org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their organization payments"
ON payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = payments.org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization payments"
ON payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = payments.org_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Create RPC for payment KPIs
CREATE OR REPLACE FUNCTION payments_kpis(org_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN amount ELSE 0 END), 0),
    'fees', COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN fee_amount ELSE 0 END), 0),
    'net', COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN (amount - fee_amount) ELSE 0 END), 0),
    'ar', COALESCE(SUM(CASE WHEN status IN ('open','pending') THEN amount ELSE 0 END), 0)
  ) INTO result
  FROM payments
  WHERE org_id = org_uuid;
  
  RETURN result;
END;
$$;