-- Phase 1: Partner/Affiliate Program Database Schema

-- Create partner types enum
CREATE TYPE partner_type AS ENUM ('PRO', 'CREATOR');

-- Create partner status enum
CREATE TYPE partner_status AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'BANNED');

-- Create commission status enum
CREATE TYPE commission_status AS ENUM ('PENDING', 'PAID', 'VOID');

-- Create payout status enum
CREATE TYPE payout_status AS ENUM ('PENDING', 'PAID', 'FAILED');

-- Partners table (main partner/affiliate records)
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type partner_type NOT NULL DEFAULT 'PRO',
  status partner_status NOT NULL DEFAULT 'PENDING',
  
  -- Commission & discount rates (stored in basis points, e.g., 2500 = 25%)
  commission_rate_bp INTEGER NOT NULL DEFAULT 2500,
  discount_rate_bp INTEGER NOT NULL DEFAULT 1500,
  
  -- Unique identifiers
  referral_code TEXT UNIQUE NOT NULL,
  referral_slug TEXT UNIQUE NOT NULL,
  
  -- Stripe integration
  stripe_account_id TEXT UNIQUE,
  stripe_promo_id TEXT,
  stripe_coupon_id TEXT,
  
  -- Application info
  business_name TEXT,
  website TEXT,
  audience_size TEXT,
  application_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partner clicks tracking (for analytics)
CREATE TABLE partner_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partner referrals (customers attributed to partners)
CREATE TABLE partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Customer references
  organization_id UUID REFERENCES organizations(id),
  stripe_customer_id TEXT,
  
  -- Attribution
  promo_code_used TEXT,
  attributed_via TEXT, -- 'link', 'code', 'manual'
  
  -- Status
  activated BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partner commissions (earnings per invoice)
CREATE TABLE partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES partner_referrals(id),
  
  -- Invoice details
  stripe_invoice_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  
  -- Amounts (in cents)
  base_amount_cents INTEGER NOT NULL,
  commission_rate_bp INTEGER NOT NULL,
  commission_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Status
  status commission_status NOT NULL DEFAULT 'PENDING',
  payout_id UUID, -- will reference partner_payouts when paid
  
  -- Metadata
  invoice_period_start TIMESTAMPTZ,
  invoice_period_end TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partner payouts (monthly transfers to Connect accounts)
CREATE TABLE partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Payout details
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Stripe transfer
  stripe_transfer_id TEXT UNIQUE,
  stripe_account_id TEXT NOT NULL,
  
  -- Status
  status payout_status NOT NULL DEFAULT 'PENDING',
  
  -- Admin
  initiated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for payout_id in commissions
ALTER TABLE partner_commissions
ADD CONSTRAINT fk_commission_payout
FOREIGN KEY (payout_id) REFERENCES partner_payouts(id);

-- Brand assets (downloadable resources for partners)
CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'logo', 'template', 'guide', 'media'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  sort_order INTEGER DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add partner tracking to organizations table
ALTER TABLE organizations
ADD COLUMN partner_id UUID REFERENCES partners(id),
ADD COLUMN partner_code TEXT,
ADD COLUMN partner_attributed_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_referral_code ON partners(referral_code);
CREATE INDEX idx_partners_referral_slug ON partners(referral_slug);
CREATE INDEX idx_partner_clicks_partner_id ON partner_clicks(partner_id);
CREATE INDEX idx_partner_clicks_created_at ON partner_clicks(created_at);
CREATE INDEX idx_partner_referrals_partner_id ON partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_organization_id ON partner_referrals(organization_id);
CREATE INDEX idx_partner_referrals_stripe_customer_id ON partner_referrals(stripe_customer_id);
CREATE INDEX idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX idx_partner_commissions_payout_id ON partner_commissions(payout_id);
CREATE INDEX idx_partner_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX idx_partner_payouts_status ON partner_payouts(status);

-- RLS Policies

-- Partners table
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own profile"
  ON partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can update own profile"
  ON partners FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can apply (insert pending partner)"
  ON partners FOR INSERT
  WITH CHECK (status = 'PENDING');

CREATE POLICY "Admins can manage all partners"
  ON partners FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Partner clicks
ALTER TABLE partner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log clicks"
  ON partner_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Partners can view own clicks"
  ON partner_clicks FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all clicks"
  ON partner_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Partner referrals
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own referrals"
  ON partner_referrals FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage referrals"
  ON partner_referrals FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view all referrals"
  ON partner_referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Partner commissions
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own commissions"
  ON partner_commissions FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage commissions"
  ON partner_commissions FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can manage all commissions"
  ON partner_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Partner payouts
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own payouts"
  ON partner_payouts FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payouts"
  ON partner_payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Brand assets
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public assets are viewable by all"
  ON brand_assets FOR SELECT
  USING (is_public = true);

CREATE POLICY "Partners can view all assets"
  ON brand_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage brand assets"
  ON brand_assets FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_referrals_updated_at
  BEFORE UPDATE ON partner_referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_commissions_updated_at
  BEFORE UPDATE ON partner_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_payouts_updated_at
  BEFORE UPDATE ON partner_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_assets_updated_at
  BEFORE UPDATE ON brand_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();