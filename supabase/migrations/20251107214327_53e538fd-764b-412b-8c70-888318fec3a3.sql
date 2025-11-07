-- Webhook events for debugging and audit trail
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed);

-- Billing invoices for complete history
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_invoices_org ON public.billing_invoices(organization_id);
CREATE INDEX idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX idx_billing_invoices_stripe ON public.billing_invoices(stripe_invoice_id);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_events (admin only)
CREATE POLICY "Admin can view webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for billing_invoices
CREATE POLICY "Providers can view their own invoices"
  ON public.billing_invoices
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all invoices"
  ON public.billing_invoices
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add saved payment methods tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_default_payment_method TEXT;

COMMENT ON TABLE public.webhook_events IS 'Stores all Stripe webhook events for debugging and audit';
COMMENT ON TABLE public.billing_invoices IS 'Stores provider subscription invoices for billing history';
COMMENT ON COLUMN public.profiles.stripe_default_payment_method IS 'Stripe payment method ID for saved cards';