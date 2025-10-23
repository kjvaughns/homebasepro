-- Add pre-book questionnaire fields to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS precheck_answers JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'medium';

-- Add constraint for urgency_level if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_urgency_level_check'
  ) THEN
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_urgency_level_check 
    CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency'));
  END IF;
END $$;

-- Create home_photos table for property images
CREATE TABLE IF NOT EXISTS home_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add property service tracking columns to homes
ALTER TABLE homes
ADD COLUMN IF NOT EXISTS last_hvac_service DATE,
ADD COLUMN IF NOT EXISTS last_plumbing_service DATE,
ADD COLUMN IF NOT EXISTS last_lawn_service DATE,
ADD COLUMN IF NOT EXISTS lawn_sqft INTEGER,
ADD COLUMN IF NOT EXISTS pool_type TEXT;

-- Enable RLS for home_photos
ALTER TABLE home_photos ENABLE ROW LEVEL SECURITY;

-- RLS: Homeowners manage their home photos
DROP POLICY IF EXISTS "Homeowners manage their home photos" ON home_photos;
CREATE POLICY "Homeowners manage their home photos"
ON home_photos FOR ALL 
USING (EXISTS (
  SELECT 1 FROM homes 
  JOIN profiles ON profiles.id = homes.owner_id
  WHERE homes.id = home_photos.home_id 
  AND profiles.user_id = auth.uid()
));

-- RLS: Providers view client home photos
DROP POLICY IF EXISTS "Providers view client home photos" ON home_photos;
CREATE POLICY "Providers view client home photos"
ON home_photos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM homes h
  JOIN bookings b ON b.home_id = h.id
  JOIN organizations o ON o.id = b.provider_org_id
  WHERE h.id = home_photos.home_id AND o.owner_id = auth.uid()
));

-- Create homeowner_documents table for PDFs and other docs
CREATE TABLE IF NOT EXISTS homeowner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('maintenance_plan', 'receipt', 'estimate', 'other')),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for homeowner_documents
ALTER TABLE homeowner_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Users manage their documents
DROP POLICY IF EXISTS "Users manage their documents" ON homeowner_documents;
CREATE POLICY "Users manage their documents"
ON homeowner_documents FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add appointment detail fields to service_visits
ALTER TABLE service_visits
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS completion_photos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS technician_notes TEXT,
ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancelation_reason TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_visits_homeowner_status 
ON service_visits(homeowner_id, status);

-- Create index for home_photos
CREATE INDEX IF NOT EXISTS idx_home_photos_home_id 
ON home_photos(home_id);

-- Create index for homeowner_documents
CREATE INDEX IF NOT EXISTS idx_homeowner_documents_profile_id 
ON homeowner_documents(profile_id);