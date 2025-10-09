-- Phase 1: Upgrade admin accounts to Scale plan
-- First, update existing subscriptions
UPDATE organization_subscriptions
SET 
  plan_tier = 'scale'::subscription_tier,
  status = 'active',
  updated_at = now()
WHERE organization_id IN (
  SELECT o.id 
  FROM organizations o
  JOIN user_roles ur ON ur.user_id = o.owner_id
  WHERE ur.role IN ('admin', 'moderator')
);

-- Then insert new ones that don't exist
INSERT INTO organization_subscriptions (organization_id, plan_tier, status, current_period_start, current_period_end)
SELECT 
  o.id,
  'scale'::subscription_tier,
  'active',
  now(),
  now() + interval '1 year'
FROM organizations o
JOIN user_roles ur ON ur.user_id = o.owner_id
WHERE ur.role IN ('admin', 'moderator')
AND NOT EXISTS (
  SELECT 1 FROM organization_subscriptions 
  WHERE organization_id = o.id
);

-- Phase 2: Multi-Service Type Support
-- Change service_type from TEXT to TEXT[] in organizations
ALTER TABLE organizations 
ALTER COLUMN service_type TYPE TEXT[] 
USING CASE 
  WHEN service_type IS NULL THEN NULL
  ELSE ARRAY[service_type]
END;

-- Change service_type from TEXT to TEXT[] in service_plans
ALTER TABLE service_plans 
ALTER COLUMN service_type TYPE TEXT[] 
USING CASE 
  WHEN service_type IS NULL THEN NULL
  ELSE ARRAY[service_type]
END;

-- Phase 3: Accounting Features
-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  amount INTEGER,
  vendor TEXT,
  category TEXT,
  receipt_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create accounting_transactions table
CREATE TABLE IF NOT EXISTS accounting_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  tax_deductible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receipts
CREATE POLICY "Organization owners can manage receipts"
ON receipts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = receipts.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all receipts"
ON receipts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for accounting_transactions
CREATE POLICY "Organization owners can manage transactions"
ON accounting_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = accounting_transactions.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all transactions"
ON accounting_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_transactions_updated_at
BEFORE UPDATE ON accounting_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();