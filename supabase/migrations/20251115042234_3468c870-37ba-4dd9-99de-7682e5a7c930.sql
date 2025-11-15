-- Add onboarding-related fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trade_type TEXT,
ADD COLUMN IF NOT EXISTS pricing_preferences JSONB,
ADD COLUMN IF NOT EXISTS ai_features_enabled JSONB DEFAULT '{"quote_followups": true, "payment_reminders": true, "review_requests": true, "appointment_reminders": true}';

-- Add trade_type and ai_generated_description to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trade_type TEXT,
ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;

-- Create provider_services table for AI-generated services
CREATE TABLE IF NOT EXISTS provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price_cents INTEGER,
  duration_minutes INTEGER,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for provider_services
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;

-- Policies for provider_services
CREATE POLICY "Providers can view their own services"
  ON provider_services FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert their own services"
  ON provider_services FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update their own services"
  ON provider_services FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete their own services"
  ON provider_services FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );