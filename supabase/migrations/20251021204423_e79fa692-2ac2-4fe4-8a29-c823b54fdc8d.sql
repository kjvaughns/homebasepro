-- Add is_default column to short_links table
ALTER TABLE short_links 
ADD COLUMN is_default boolean DEFAULT false;

-- Add unique constraint to ensure only one default link per organization
CREATE UNIQUE INDEX short_links_org_default_unique 
ON short_links (org_id) 
WHERE is_default = true;

-- Add comment explaining the constraint
COMMENT ON INDEX short_links_org_default_unique IS 'Ensures each organization can only have one default short link';