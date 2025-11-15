-- Create market pricing cache table
CREATE TABLE IF NOT EXISTS public.market_pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_type TEXT NOT NULL,
  service_area TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service_call', 'fixed_scope')),
  local_median_cents INTEGER NOT NULL,
  market_range_low_cents INTEGER,
  market_range_high_cents INTEGER,
  data_points INTEGER DEFAULT 0,
  confidence_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(trade_type, service_area, category)
);

-- Create client intake questions table
CREATE TABLE IF NOT EXISTS public.client_intake_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'multiple_choice', 'yes_no', 'number', 'image')),
  options JSONB,
  complexity_weight INTEGER DEFAULT 1 CHECK (complexity_weight BETWEEN 1 AND 10),
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_market_pricing_lookup ON public.market_pricing_cache(trade_type, service_area, category);
CREATE INDEX IF NOT EXISTS idx_market_pricing_expires ON public.market_pricing_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_client_questions_org ON public.client_intake_questions(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_questions_active ON public.client_intake_questions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.market_pricing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_intake_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_pricing_cache (read-only for all authenticated users)
CREATE POLICY "Anyone can read market pricing data"
  ON public.market_pricing_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for client_intake_questions
CREATE POLICY "Users can read their org's questions"
  ON public.client_intake_questions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert their org's questions"
  ON public.client_intake_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's questions"
  ON public.client_intake_questions
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's questions"
  ON public.client_intake_questions
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );