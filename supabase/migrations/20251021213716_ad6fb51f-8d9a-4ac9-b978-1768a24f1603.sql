-- Add unique constraint to prevent duplicate client records
ALTER TABLE clients 
ADD CONSTRAINT clients_org_homeowner_unique 
UNIQUE (organization_id, homeowner_profile_id);

-- Backfill client records for all active homeowner subscriptions
INSERT INTO clients (
  organization_id, 
  homeowner_profile_id, 
  name, 
  email, 
  status, 
  created_at
)
SELECT DISTINCT
  hs.provider_org_id,
  hs.homeowner_id,
  COALESCE(p.full_name, 'Homeowner'),
  COALESCE(u.email, 'no-email@homebase.com'),
  'active',
  hs.created_at
FROM homeowner_subscriptions hs
JOIN profiles p ON p.id = hs.homeowner_id
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE hs.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM clients c 
  WHERE c.homeowner_profile_id = hs.homeowner_id 
  AND c.organization_id = hs.provider_org_id
)
ON CONFLICT (organization_id, homeowner_profile_id) DO NOTHING;

-- Create function to sync client on subscription insert
CREATE OR REPLACE FUNCTION sync_client_on_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clients (
    organization_id,
    homeowner_profile_id,
    name,
    email,
    status,
    created_at
  )
  SELECT 
    NEW.provider_org_id,
    NEW.homeowner_id,
    COALESCE(p.full_name, 'Homeowner'),
    COALESCE(u.email, 'no-email@homebase.com'),
    'active',
    NOW()
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.id = NEW.homeowner_id
  ON CONFLICT (organization_id, homeowner_profile_id) 
  DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-sync future subscriptions
CREATE TRIGGER trigger_sync_client_on_subscription
AFTER INSERT ON homeowner_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_client_on_subscription();