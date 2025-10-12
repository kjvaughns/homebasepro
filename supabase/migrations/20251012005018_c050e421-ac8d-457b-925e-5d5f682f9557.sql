-- Add marketing consent column to waitlist table
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;

-- Create index for marketing consent filtering
CREATE INDEX IF NOT EXISTS idx_waitlist_marketing_consent 
ON waitlist(marketing_consent) 
WHERE marketing_consent = true;

-- Add comment for documentation
COMMENT ON COLUMN waitlist.marketing_consent IS 'User consent to receive marketing updates and communications';