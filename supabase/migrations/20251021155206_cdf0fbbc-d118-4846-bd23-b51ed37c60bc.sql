-- Fix Security Issue: Add SET search_path to all SECURITY DEFINER functions
-- This prevents search path manipulation attacks

-- Fix check_client_limit
CREATE OR REPLACE FUNCTION public.check_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix check_provider_availability
CREATE OR REPLACE FUNCTION public.check_provider_availability(p_provider_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Returns TRUE if provider is available (no conflicts)
  -- Returns FALSE if provider has conflicting booking
  RETURN NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE provider_org_id = p_provider_id
      AND status NOT IN ('canceled', 'rejected')
      AND (
        -- Check for any time overlap
        (date_time_start <= p_start_time AND date_time_end > p_start_time) OR
        (date_time_start < p_end_time AND date_time_end >= p_end_time) OR
        (date_time_start >= p_start_time AND date_time_end <= p_end_time)
      )
  );
END;
$function$;

-- Fix check_team_seat_limit
CREATE OR REPLACE FUNCTION public.check_team_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.referral_profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$function$;

-- Fix increment_referral_count
CREATE OR REPLACE FUNCTION public.increment_referral_count(ref_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.referral_stats (referrer_code, total_referred, last_updated)
  VALUES (ref_code, 1, now())
  ON CONFLICT (referrer_code)
  DO UPDATE SET 
    total_referred = referral_stats.total_referred + 1,
    last_updated = now();
END;
$function$;

-- Fix payments_kpis
CREATE OR REPLACE FUNCTION public.payments_kpis(org_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN amount ELSE 0 END), 0),
    'fees', COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN fee_amount ELSE 0 END), 0),
    'net', COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN (amount - fee_amount) ELSE 0 END), 0),
    'ar', COALESCE(SUM(CASE WHEN status IN ('open','pending') THEN amount ELSE 0 END), 0)
  ) INTO result
  FROM payments
  WHERE org_id = org_uuid;
  
  RETURN result;
END;
$function$;