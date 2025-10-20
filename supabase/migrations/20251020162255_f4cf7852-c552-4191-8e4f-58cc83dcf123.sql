-- Create function to match providers based on service type and location
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

  -- Return matched providers sorted by trust score and distance
  RETURN QUERY
  SELECT 
    o.id as provider_org_id,
    0::NUMERIC as distance_miles, -- Simplified for MVP, can add real distance calculation later
    COALESCE(pm.trust_score, 5.0) as trust_score,
    (
      COALESCE(pm.trust_score, 5.0) * 0.5 + -- 50% weight on trust
      CASE WHEN pc.id IS NOT NULL THEN 30 ELSE 0 END + -- 30 points for capability match
      CASE WHEN o.service_area IS NULL OR o.service_area = '' OR position(v_home_zip in o.service_area) > 0 THEN 20 ELSE 0 END -- 20 points for service area
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