-- Phase 1: Extend Organizations Table for Plans & Fees
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS team_limit int DEFAULT 5,
  ADD COLUMN IF NOT EXISTS transaction_fee_pct numeric DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS instant_payouts_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_payout_method text DEFAULT 'bank';

-- Phase 2: Create Homeowner Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  default_payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers can view their own data
CREATE POLICY "Users can view their own customer data"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

-- Customers can insert their own data
CREATE POLICY "Users can insert their own customer data"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Customers can update their own data
CREATE POLICY "Users can update their own customer data"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

-- Phase 3: Enhance Payments Table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transfer_destination text,
  ADD COLUMN IF NOT EXISTS application_fee_cents int,
  ADD COLUMN IF NOT EXISTS fee_pct_at_time numeric,
  ADD COLUMN IF NOT EXISTS captured boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS refunded_cents int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_group text,
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Phase 4: Create Immutable Ledger Table
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL, -- charge, fee, transfer, refund, dispute, payout, subscription_invoice
  direction text NOT NULL, -- debit, credit
  amount_cents int NOT NULL,
  currency text DEFAULT 'usd',
  stripe_ref text,
  party text NOT NULL, -- platform, provider, customer
  job_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  homeowner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Admins can view all ledger entries
CREATE POLICY "Admins can view all ledger entries"
  ON ledger_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Providers can view their own ledger entries
CREATE POLICY "Providers can view their own ledger entries"
  ON ledger_entries FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Only system can insert (via edge functions with service role)
CREATE POLICY "Only service role can insert ledger entries"
  ON ledger_entries FOR INSERT
  WITH CHECK (false); -- Will use service role key in edge functions

-- Prevent updates and deletes (immutable)
CREATE POLICY "Ledger entries are immutable"
  ON ledger_entries FOR UPDATE
  USING (false);

CREATE POLICY "Ledger entries cannot be deleted"
  ON ledger_entries FOR DELETE
  USING (false);

-- Phase 5: Create Provider Subscriptions Table
CREATE TABLE IF NOT EXISTS provider_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free', -- free, growth, pro, scale
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE provider_subscriptions ENABLE ROW LEVEL SECURITY;

-- Providers can view their own subscription
CREATE POLICY "Providers can view their own subscription"
  ON provider_subscriptions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON provider_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Phase 6: Enhance Bookings Table for Deposits & Escrow
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount int,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_captured boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_occurred_at ON ledger_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_party ON ledger_entries(party);
CREATE INDEX IF NOT EXISTS idx_ledger_provider ON ledger_entries(provider_id);
CREATE INDEX IF NOT EXISTS idx_ledger_stripe_ref ON ledger_entries(stripe_ref);
CREATE INDEX IF NOT EXISTS idx_payments_transfer_group ON payments(transfer_group);
CREATE INDEX IF NOT EXISTS idx_provider_subscriptions_stripe_sub ON provider_subscriptions(stripe_subscription_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

CREATE TRIGGER trigger_provider_subscriptions_updated_at
  BEFORE UPDATE ON provider_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();