-- Create enum for subscription plan tiers
CREATE TYPE public.subscription_tier AS ENUM ('free', 'growth', 'pro', 'scale');

-- Create organizations table (service providers)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  service_type TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  service_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier public.subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  client_limit INTEGER,
  transaction_fee_percent DECIMAL(4,2) NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create organization subscriptions table
CREATE TABLE public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_tier public.subscription_tier NOT NULL REFERENCES public.subscription_plans(tier),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transaction logs table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in cents
  fee_amount INTEGER NOT NULL, -- in cents
  fee_percent DECIMAL(4,2) NOT NULL,
  description TEXT,
  stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organizations"
  ON public.organizations
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own organizations"
  ON public.organizations
  FOR UPDATE
  USING (owner_id = auth.uid());

-- RLS Policies for subscription plans (public read)
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (true);

-- RLS Policies for organization subscriptions
CREATE POLICY "Users can view their organization subscriptions"
  ON public.organization_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_subscriptions.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create subscriptions for their organizations"
  ON public.organization_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_subscriptions.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization subscriptions"
  ON public.organization_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_subscriptions.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Users can view their organization transactions"
  ON public.transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = transactions.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_org_subscriptions_org ON public.organization_subscriptions(organization_id);
CREATE INDEX idx_org_subscriptions_status ON public.organization_subscriptions(status);
CREATE INDEX idx_transactions_org ON public.transactions(organization_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (tier, name, price_monthly, client_limit, transaction_fee_percent, features) VALUES
  ('free', 'Free Plan (Starter)', 0, 5, 8.00, '["Client Management", "Recurring Billing", "Basic Support", "Mobile Access"]'::jsonb),
  ('growth', 'Growth Plan', 4900, 20, 2.50, '["Everything in Free", "Up to 20 clients", "Automated Reminders", "1 Team Member", "Review Requests", "Basic Analytics", "Priority Support"]'::jsonb),
  ('pro', 'Pro Plan', 12900, 50, 2.00, '["Everything in Growth", "Up to 50 clients", "3 Team Members", "White-Label Branding", "Advanced Analytics", "Custom Domain", "Premium Support"]'::jsonb),
  ('scale', 'Scale Plan', 29900, NULL, 1.50, '["Everything in Pro", "Unlimited clients", "Unlimited Team Members", "API Access & Integrations", "Full Analytics Suite", "Dedicated Account Manager", "Custom Onboarding"]'::jsonb);