-- ==============================================
-- REVENUE SYSTEMS ENFORCEMENT
-- ==============================================

-- 1. Team Seat Limit Enforcement
-- Function to check team seat limit before insert
CREATE OR REPLACE FUNCTION check_team_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  seat_limit INTEGER;
  org_plan TEXT;
BEGIN
  -- Get organization plan and limit
  SELECT plan, team_limit INTO org_plan, seat_limit
  FROM organizations
  WHERE id = NEW.organization_id;
  
  -- Count current team members (invited or active)
  SELECT COUNT(*) INTO current_count
  FROM team_members
  WHERE organization_id = NEW.organization_id
    AND status IN ('invited', 'active');
  
  -- Check if at limit
  IF current_count >= seat_limit THEN
    RAISE EXCEPTION 'Team seat limit reached for % plan. Current: %, Limit: %. Upgrade plan to add more members.', 
      org_plan, current_count, seat_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on team_members insert
DROP TRIGGER IF EXISTS enforce_team_seat_limit ON team_members;
CREATE TRIGGER enforce_team_seat_limit
BEFORE INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION check_team_seat_limit();

-- ==============================================
-- 2. Client Limit Enforcement (Free Plan Only)
-- Function to check client limit before insert
CREATE OR REPLACE FUNCTION check_client_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  org_plan TEXT;
  client_limit INTEGER;
BEGIN
  -- Get organization plan
  SELECT plan INTO org_plan
  FROM organizations
  WHERE id = NEW.organization_id;
  
  -- Set client limits by plan
  IF org_plan = 'free' OR org_plan IS NULL THEN
    client_limit := 5;
  ELSE
    -- Unlimited for paid plans
    RETURN NEW;
  END IF;
  
  -- Count current active clients
  SELECT COUNT(*) INTO current_count
  FROM clients
  WHERE organization_id = NEW.organization_id
    AND status = 'active';
  
  -- Check if at limit
  IF current_count >= client_limit THEN
    RAISE EXCEPTION 'Client limit reached for % plan. Current: %, Limit: %. Upgrade to Growth plan for unlimited clients.', 
      org_plan, current_count, client_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on clients insert
DROP TRIGGER IF EXISTS enforce_client_limit ON clients;
CREATE TRIGGER enforce_client_limit
BEFORE INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION check_client_limit();

-- ==============================================
-- 3. Featured Listings - Provider Match with Plan Boost
-- Update match_providers function to include plan-based priority
CREATE OR REPLACE FUNCTION public.match_providers(
  p_service_type TEXT,
  p_home_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  provider_org_id UUID,
  distance_miles NUMERIC,
  trust_score NUMERIC,
  match_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_home_zip TEXT;
  v_service_category TEXT;
BEGIN
  -- Get home ZIP code
  SELECT zip_code INTO v_home_zip
  FROM homes
  WHERE id = p_home_id;

  -- Map service type to category for tag matching
  v_service_category := CASE
    WHEN p_service_type ILIKE '%hvac%' OR p_service_type ILIKE '%ac%' OR p_service_type ILIKE '%heat%' THEN 'HVAC'
    WHEN p_service_type ILIKE '%plumb%' OR p_service_type ILIKE '%leak%' OR p_service_type ILIKE '%drain%' THEN 'Plumbing'
    WHEN p_service_type ILIKE '%electric%' OR p_service_type ILIKE '%wiring%' THEN 'Electrical'
    WHEN p_service_type ILIKE '%lawn%' OR p_service_type ILIKE '%grass%' OR p_service_type ILIKE '%mow%' THEN 'Lawn Care'
    WHEN p_service_type ILIKE '%clean%' THEN 'Cleaning'
    WHEN p_service_type ILIKE '%gutter%' OR p_service_type ILIKE '%pressure%' THEN 'Exterior'
    ELSE 'General'
  END;

  -- Return matched providers sorted by plan tier, trust score, and distance
  RETURN QUERY
  SELECT 
    o.id as provider_org_id,
    0::NUMERIC as distance_miles,
    COALESCE(pm.trust_score, 5.0) as trust_score,
    (
      COALESCE(pm.trust_score, 5.0) * 0.5 + -- 50% weight on trust
      CASE WHEN pc.id IS NOT NULL THEN 30 ELSE 0 END + -- 30 points for capability match
      CASE WHEN o.service_area IS NULL OR o.service_area = '' OR position(v_home_zip in o.service_area) > 0 THEN 20 ELSE 0 END + -- 20 points for service area
      -- NEW: Plan-based priority boost for featured listings
      CASE 
        WHEN o.plan = 'scale' THEN 100  -- Scale plan providers get top priority
        WHEN o.plan = 'pro' THEN 50     -- Pro plan providers get medium priority
        WHEN o.plan = 'growth' THEN 25  -- Growth plan providers get small boost
        ELSE 0                           -- Free plan providers get no boost (organic ranking)
      END
    ) as match_score
  FROM organizations o
  LEFT JOIN provider_metrics pm ON pm.provider_org_id = o.id
  LEFT JOIN provider_capabilities pc ON pc.provider_org_id = o.id
  LEFT JOIN service_tags st ON st.id = pc.tag_id AND st.category = v_service_category
  WHERE 
    (o.service_type IS NULL OR v_service_category = ANY(o.service_type))
    OR pc.id IS NOT NULL
  GROUP BY o.id, pm.trust_score, pc.id, o.service_area
  ORDER BY match_score DESC, trust_score DESC
  LIMIT p_limit;
END;
$$;