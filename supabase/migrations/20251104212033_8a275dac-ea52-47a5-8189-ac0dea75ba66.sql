-- Create payout history cache table
CREATE TABLE IF NOT EXISTS stripe_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payout_id text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL, -- pending, in_transit, paid, failed
  arrival_date timestamp with time zone,
  payout_type text, -- standard, instant
  fee_cents integer DEFAULT 0,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create balance snapshots table
CREATE TABLE IF NOT EXISTS balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  available_cents integer NOT NULL DEFAULT 0,
  pending_cents integer NOT NULL DEFAULT 0,
  currency text DEFAULT 'usd',
  captured_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_payouts
CREATE POLICY "Providers can view their own payouts"
  ON stripe_payouts FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for balance_snapshots
CREATE POLICY "Providers can view their own balance snapshots"
  ON balance_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_stripe_payouts_org ON stripe_payouts(organization_id);
CREATE INDEX idx_stripe_payouts_created ON stripe_payouts(created_at DESC);
CREATE INDEX idx_balance_snapshots_org ON balance_snapshots(organization_id);
CREATE INDEX idx_balance_snapshots_captured ON balance_snapshots(captured_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_stripe_payouts_updated_at
  BEFORE UPDATE ON stripe_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();