-- =============================================
-- UNIVERSAL WORKFLOW SYSTEM - DATABASE FOUNDATION
-- Weeks 1-2: Core Tables, Triggers, and RLS
-- =============================================

-- 1. QUOTES TABLE (formal estimates that can be approved)
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  provider_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  
  -- Quote details
  quote_type TEXT NOT NULL CHECK (quote_type IN ('diagnostic', 'full_service', 'emergency')),
  service_name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing breakdown
  labor_cost INTEGER, -- in cents
  parts_cost INTEGER, -- in cents
  total_amount INTEGER NOT NULL, -- in cents
  line_items JSONB DEFAULT '[]'::jsonb,
  
  -- Validity
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'superseded')),
  
  -- Conversion tracking
  converted_to_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(3,2),
  pricing_factors JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SERVICE CALLS (diagnostic visits that may convert to full jobs)
CREATE TABLE IF NOT EXISTS service_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  provider_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'no_show')),
  
  -- Flat-rate fee
  diagnostic_fee INTEGER NOT NULL, -- in cents, typically $99-$150
  fee_paid BOOLEAN DEFAULT false,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Findings & recommendations
  technician_notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  diagnosis_summary TEXT,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Conversion to full job
  generated_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  converted_to_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Assignment
  assigned_team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AI LEARNING EVENTS (feedback loop for continuous improvement)
CREATE TABLE IF NOT EXISTS ai_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'pricing_feedback', 
    'provider_match_feedback', 
    'job_outcome', 
    'quote_accuracy',
    'service_duration_actual',
    'problem_diagnosis_accuracy'
  )),
  
  -- Context
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  service_call_id UUID REFERENCES service_calls(id) ON DELETE SET NULL,
  provider_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- AI prediction vs reality
  ai_predicted JSONB,
  actual_outcome JSONB,
  accuracy_score NUMERIC(3,2),
  
  -- Anonymized learning data
  service_category TEXT,
  region_zip TEXT,
  property_size_bucket TEXT,
  complexity_factors JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WORKFLOW STATE TRACKER (unified status across both sides)
CREATE TABLE IF NOT EXISTS workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Linked entities (polymorphic tracking)
  service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  service_call_id UUID REFERENCES service_calls(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Parties
  homeowner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Unified workflow status
  workflow_stage TEXT NOT NULL CHECK (workflow_stage IN (
    'request_submitted',
    'ai_analyzing',
    'providers_matched',
    'quote_sent',
    'diagnostic_scheduled',
    'diagnostic_completed',
    'quote_approved',
    'job_scheduled',
    'job_in_progress',
    'job_completed',
    'invoice_sent',
    'payment_received',
    'review_requested',
    'workflow_complete'
  )),
  
  -- Timeline tracking
  stage_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage_completed_at TIMESTAMPTZ,
  
  -- Notifications
  homeowner_notified_at TIMESTAMPTZ,
  provider_notified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_provider ON quotes(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_quotes_homeowner ON quotes(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_service_request ON quotes(service_request_id);

CREATE INDEX IF NOT EXISTS idx_service_calls_provider ON service_calls(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_service_calls_homeowner ON service_calls(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_service_calls_status ON service_calls(status);
CREATE INDEX IF NOT EXISTS idx_service_calls_scheduled ON service_calls(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_workflow_states_homeowner ON workflow_states(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_provider ON workflow_states(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_stage ON workflow_states(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_workflow_states_service_request ON workflow_states(service_request_id);

CREATE INDEX IF NOT EXISTS idx_ai_learning_event_type ON ai_learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_service_category ON ai_learning_events(service_category);

-- =============================================
-- TRIGGERS FOR WORKFLOW AUTOMATION
-- =============================================

-- Auto-create workflow state when service request created
CREATE OR REPLACE FUNCTION create_workflow_on_service_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workflow_states (
    service_request_id,
    homeowner_id,
    provider_org_id,
    workflow_stage
  ) VALUES (
    NEW.id,
    NEW.homeowner_id,
    NEW.provider_org_id,
    'request_submitted'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_workflow_on_service_request ON service_requests;
CREATE TRIGGER trigger_workflow_on_service_request
AFTER INSERT ON service_requests
FOR EACH ROW
EXECUTE FUNCTION create_workflow_on_service_request();

-- Auto-advance workflow when quote accepted
CREATE OR REPLACE FUNCTION advance_workflow_on_quote_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    UPDATE workflow_states
    SET 
      workflow_stage = 'quote_approved',
      quote_id = NEW.id,
      stage_completed_at = NOW(),
      updated_at = NOW()
    WHERE service_request_id = NEW.service_request_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_advance_workflow_quote ON quotes;
CREATE TRIGGER trigger_advance_workflow_quote
AFTER UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION advance_workflow_on_quote_accept();

-- Log AI learning event when job completes
CREATE OR REPLACE FUNCTION log_job_completion_learning()
RETURNS TRIGGER AS $$
DECLARE
  v_quote RECORD;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT * INTO v_quote FROM quotes WHERE converted_to_booking_id = NEW.id LIMIT 1;
    
    IF FOUND THEN
      INSERT INTO ai_learning_events (
        event_type,
        booking_id,
        quote_id,
        provider_org_id,
        ai_predicted,
        actual_outcome,
        accuracy_score,
        service_category
      ) VALUES (
        'job_outcome',
        NEW.id,
        v_quote.id,
        NEW.provider_org_id,
        jsonb_build_object(
          'estimated_price', v_quote.total_amount,
          'estimated_duration', EXTRACT(EPOCH FROM (NEW.date_time_end - NEW.date_time_start))
        ),
        jsonb_build_object(
          'final_price', COALESCE(NEW.final_price, NEW.deposit_amount),
          'actual_duration', EXTRACT(EPOCH FROM (NEW.updated_at - NEW.date_time_start))
        ),
        CASE 
          WHEN NEW.final_price IS NULL THEN 0
          WHEN v_quote.total_amount = 0 THEN 0
          ELSE LEAST(1.0, COALESCE(NEW.final_price, NEW.deposit_amount)::numeric / v_quote.total_amount)
        END,
        NEW.service_name
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_job_completion ON bookings;
CREATE TRIGGER trigger_log_job_completion
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_job_completion_learning();

-- Update workflow when service call scheduled
CREATE OR REPLACE FUNCTION update_workflow_on_service_call()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE workflow_states
    SET 
      workflow_stage = 'diagnostic_scheduled',
      service_call_id = NEW.id,
      stage_completed_at = NOW(),
      updated_at = NOW()
    WHERE service_request_id = NEW.service_request_id
    AND workflow_stage IN ('request_submitted', 'ai_analyzing', 'providers_matched');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE workflow_states
    SET 
      workflow_stage = 'diagnostic_completed',
      stage_completed_at = NOW(),
      updated_at = NOW()
    WHERE service_call_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_workflow_service_call ON service_calls;
CREATE TRIGGER trigger_update_workflow_service_call
AFTER INSERT OR UPDATE ON service_calls
FOR EACH ROW
EXECUTE FUNCTION update_workflow_on_service_call();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_calls_updated_at ON service_calls;
CREATE TRIGGER update_service_calls_updated_at
BEFORE UPDATE ON service_calls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_states_updated_at ON workflow_states;
CREATE TRIGGER update_workflow_states_updated_at
BEFORE UPDATE ON workflow_states
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;

-- QUOTES POLICIES
CREATE POLICY "Homeowners can view their quotes" ON quotes
FOR SELECT USING (homeowner_id = auth.uid());

CREATE POLICY "Providers can view their quotes" ON quotes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = quotes.provider_org_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can create quotes" ON quotes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = quotes.provider_org_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their quotes" ON quotes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = quotes.provider_org_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Homeowners can update quote status" ON quotes
FOR UPDATE USING (homeowner_id = auth.uid());

-- SERVICE CALLS POLICIES
CREATE POLICY "Homeowners can view their service calls" ON service_calls
FOR SELECT USING (homeowner_id = auth.uid());

CREATE POLICY "Providers can view their service calls" ON service_calls
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = service_calls.provider_org_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can create service calls" ON service_calls
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = service_calls.provider_org_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their service calls" ON service_calls
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = service_calls.provider_org_id AND owner_id = auth.uid()
  )
);

-- WORKFLOW STATES POLICIES
CREATE POLICY "Homeowners can view their workflow states" ON workflow_states
FOR SELECT USING (homeowner_id = auth.uid());

CREATE POLICY "Providers can view their workflow states" ON workflow_states
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = workflow_states.provider_org_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "System can manage workflow states" ON workflow_states
FOR ALL USING (true);

-- AI LEARNING EVENTS POLICIES (read-only for analysis)
CREATE POLICY "Service role can manage learning events" ON ai_learning_events
FOR ALL USING (auth.role() = 'service_role');