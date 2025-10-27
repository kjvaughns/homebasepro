-- P0: Fix security definer functions search_path (8 functions)
-- This prevents SQL injection via search_path manipulation

-- Fix update_conversation_preview
DROP FUNCTION IF EXISTS public.update_conversation_preview() CASCADE;
CREATE OR REPLACE FUNCTION public.update_conversation_preview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Photo'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      ELSE ''
    END,
    unread_count_homeowner = CASE 
      WHEN NEW.sender_type = 'provider' THEN unread_count_homeowner + 1
      ELSE unread_count_homeowner
    END,
    unread_count_provider = CASE 
      WHEN NEW.sender_type = 'homeowner' THEN unread_count_provider + 1
      ELSE unread_count_provider
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- Fix schedule_followup_on_booking_completion
DROP FUNCTION IF EXISTS public.schedule_followup_on_booking_completion() CASCADE;
CREATE OR REPLACE FUNCTION public.schedule_followup_on_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.follow_up_actions (
      booking_id, homeowner_id, provider_org_id, action_type, scheduled_for
    ) VALUES 
      (NEW.id, NEW.homeowner_profile_id, NEW.provider_org_id, 'satisfaction_check', now() + INTERVAL '24 hours'),
      (NEW.id, NEW.homeowner_profile_id, NEW.provider_org_id, 'request_review', now() + INTERVAL '48 hours'),
      (NEW.id, NEW.homeowner_profile_id, NEW.provider_org_id, 'rebook_service', now() + INTERVAL '30 days');
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix check_client_limit
DROP FUNCTION IF EXISTS public.check_client_limit() CASCADE;
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
  SELECT plan INTO org_plan FROM organizations WHERE id = NEW.organization_id;
  
  IF org_plan = 'free' OR org_plan IS NULL THEN
    client_limit := 5;
  ELSE
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM clients
  WHERE organization_id = NEW.organization_id AND status = 'active';
  
  IF current_count >= client_limit THEN
    RAISE EXCEPTION 'Client limit reached for % plan. Current: %, Limit: %. Upgrade to Growth plan for unlimited clients.', 
      org_plan, current_count, client_limit;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix check_team_seat_limit
DROP FUNCTION IF EXISTS public.check_team_seat_limit() CASCADE;
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
  SELECT plan, team_limit INTO org_plan, seat_limit
  FROM organizations WHERE id = NEW.organization_id;
  
  SELECT COUNT(*) INTO current_count
  FROM team_members
  WHERE organization_id = NEW.organization_id AND status IN ('invited', 'active');
  
  IF current_count >= seat_limit THEN
    RAISE EXCEPTION 'Team seat limit reached for % plan. Current: %, Limit: %. Upgrade plan to add more members.', 
      org_plan, current_count, seat_limit;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix sync_booking_payment_status
DROP FUNCTION IF EXISTS public.sync_booking_payment_status() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_booking_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status = 'paid' AND NEW.job_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'confirmed', payment_captured = TRUE, updated_at = NOW()
    WHERE id = NEW.job_id AND status != 'canceled';
  END IF;
  
  IF NEW.status = 'refunded' AND NEW.job_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'canceled', cancellation_reason = 'Payment refunded', updated_at = NOW()
    WHERE id = NEW.job_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_client_lifetime_value
DROP FUNCTION IF EXISTS public.update_client_lifetime_value() CASCADE;
CREATE OR REPLACE FUNCTION public.update_client_lifetime_value()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.clients
  SET lifetime_value = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.payments
    WHERE homeowner_profile_id = NEW.homeowner_profile_id AND status = 'completed'
  )
  WHERE homeowner_profile_id = NEW.homeowner_profile_id;
  RETURN NEW;
END;
$function$;

-- Fix update_client_last_contact
DROP FUNCTION IF EXISTS public.update_client_last_contact() CASCADE;
CREATE OR REPLACE FUNCTION public.update_client_last_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.clients
  SET last_contact_at = NEW.created_at
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$function$;

-- Fix sync_client_on_subscription
DROP FUNCTION IF EXISTS public.sync_client_on_subscription() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_client_on_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO clients (
    organization_id, homeowner_profile_id, name, email, status, created_at
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
  ON CONFLICT (organization_id, homeowner_profile_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- P1: Create push_notification_logs table for delivery monitoring
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  endpoint text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'delivered')),
  error_message text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_logs_user_id ON public.push_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_status ON public.push_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_logs_created_at ON public.push_notification_logs(created_at DESC);

ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all push logs"
  ON public.push_notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own push logs"
  ON public.push_notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- P1: Add expires_at to invoices table for payment link expiration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN expires_at timestamptz;
    
    -- Set default expiration for existing invoices (30 days from created_at)
    UPDATE public.invoices 
    SET expires_at = created_at + INTERVAL '30 days'
    WHERE expires_at IS NULL AND status = 'open';
  END IF;
END $$;

-- P1: Create atomic booking creation function to prevent race conditions
CREATE OR REPLACE FUNCTION public.check_and_create_booking(
  p_provider_org_id uuid,
  p_homeowner_profile_id uuid,
  p_service_name text,
  p_address text,
  p_date_time_start timestamptz,
  p_date_time_end timestamptz,
  p_notes text DEFAULT NULL,
  p_home_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_booking_id uuid;
  v_conflicts integer;
BEGIN
  -- Check for conflicts first
  SELECT COUNT(*) INTO v_conflicts
  FROM bookings
  WHERE provider_org_id = p_provider_org_id
    AND status NOT IN ('canceled', 'rejected')
    AND (
      (date_time_start <= p_date_time_start AND date_time_end > p_date_time_start) OR
      (date_time_start < p_date_time_end AND date_time_end >= p_date_time_end) OR
      (date_time_start >= p_date_time_start AND date_time_end <= p_date_time_end)
    );
  
  IF v_conflicts > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Provider is not available during this time slot',
      'conflicts', v_conflicts
    );
  END IF;
  
  -- Create booking atomically
  INSERT INTO bookings (
    provider_org_id,
    homeowner_profile_id,
    service_name,
    address,
    date_time_start,
    date_time_end,
    notes,
    home_id,
    status
  ) VALUES (
    p_provider_org_id,
    p_homeowner_profile_id,
    p_service_name,
    p_address,
    p_date_time_start,
    p_date_time_end,
    p_notes,
    p_home_id,
    'pending'
  )
  RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id
  );
END;
$function$;