-- Extend services table to handle both one-time and recurring services
ALTER TABLE services ADD COLUMN IF NOT EXISTS billing_frequency text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS includes_features text[] DEFAULT '{}';

-- Migrate data from service_plans to services table (with proper type casting)
INSERT INTO services (
  organization_id, name, description, category, 
  pricing_type, default_price, is_active, is_recurring, 
  billing_frequency, includes_features, created_at, updated_at
)
SELECT 
  organization_id, 
  name, 
  description, 
  COALESCE(service_type[1], 'General') as category,
  'flat' as pricing_type, 
  price as default_price, 
  is_active, 
  is_recurring, 
  billing_frequency, 
  CASE 
    WHEN includes_features IS NOT NULL THEN 
      ARRAY(SELECT jsonb_array_elements_text(includes_features))
    ELSE '{}'::text[]
  END as includes_features,
  created_at,
  updated_at
FROM service_plans
ON CONFLICT DO NOTHING;