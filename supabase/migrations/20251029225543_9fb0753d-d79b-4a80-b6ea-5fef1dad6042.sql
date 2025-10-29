-- Add price range columns
ALTER TABLE services
ADD COLUMN price_min integer,
ADD COLUMN price_max integer,
ADD COLUMN duration_min_minutes integer,
ADD COLUMN duration_max_minutes integer,
ADD COLUMN labor_price integer,
ADD COLUMN materials_price integer;

-- Add comments for clarity
COMMENT ON COLUMN services.price_min IS 'Minimum price in cents for price range';
COMMENT ON COLUMN services.price_max IS 'Maximum price in cents for price range';
COMMENT ON COLUMN services.duration_min_minutes IS 'Minimum duration in minutes for duration range';
COMMENT ON COLUMN services.duration_max_minutes IS 'Maximum duration in minutes for duration range';
COMMENT ON COLUMN services.labor_price IS 'Labor component price in cents';
COMMENT ON COLUMN services.materials_price IS 'Materials/product component price in cents';