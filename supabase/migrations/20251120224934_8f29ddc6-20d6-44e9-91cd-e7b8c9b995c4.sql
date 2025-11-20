-- Migration: Add marketplace and booking intake features

-- Add intake response columns to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS intake_responses jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_follow_up_responses jsonb DEFAULT '{}';

-- Add marketplace columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS marketplace_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketplace_published_at timestamp with time zone;

-- Add analytics to short_links
ALTER TABLE short_links
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;

-- Create index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_orgs_marketplace 
ON organizations(marketplace_published, created_at) 
WHERE marketplace_published = true;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_short_link_views(link_slug text)
RETURNS void AS $$
BEGIN
  UPDATE short_links 
  SET view_count = view_count + 1,
      last_viewed_at = NOW()
  WHERE slug = link_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on short_links if not already enabled
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can read active short links" ON short_links;
CREATE POLICY "Anyone can read active short links"
ON short_links FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Org members can manage their short links" ON short_links;
CREATE POLICY "Org members can manage their short links"
ON short_links FOR ALL
USING (is_org_member(org_id, auth.uid()));

COMMENT ON COLUMN bookings.intake_responses IS 'Stores answers to provider intake questions';
COMMENT ON COLUMN bookings.ai_follow_up_responses IS 'Stores AI-generated follow-up Q&A';
COMMENT ON COLUMN organizations.marketplace_published IS 'Whether provider appears in public marketplace';
COMMENT ON COLUMN short_links.view_count IS 'Number of times the short link was viewed';
COMMENT ON FUNCTION increment_short_link_views IS 'Increments view count when short link is accessed';