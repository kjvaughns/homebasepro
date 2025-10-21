
-- Fix search_path for all SECURITY DEFINER trigger functions
-- This prevents search path manipulation attacks

-- Fix reset_unread_count
CREATE OR REPLACE FUNCTION public.reset_unread_count(conv_id uuid, user_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF user_type = 'homeowner' THEN
    UPDATE conversations SET unread_count_homeowner = 0 WHERE id = conv_id;
  ELSIF user_type = 'provider' THEN
    UPDATE conversations SET unread_count_provider = 0 WHERE id = conv_id;
  END IF;
END;
$function$;

-- Fix schedule_followup_on_booking_completion
CREATE OR REPLACE FUNCTION public.schedule_followup_on_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Schedule 24h satisfaction check
    INSERT INTO public.follow_up_actions (
      booking_id,
      homeowner_id,
      provider_org_id,
      action_type,
      scheduled_for
    ) VALUES (
      NEW.id,
      NEW.homeowner_profile_id,
      NEW.provider_org_id,
      'satisfaction_check',
      now() + INTERVAL '24 hours'
    );
    
    -- Schedule 48h review request
    INSERT INTO public.follow_up_actions (
      booking_id,
      homeowner_id,
      provider_org_id,
      action_type,
      scheduled_for
    ) VALUES (
      NEW.id,
      NEW.homeowner_profile_id,
      NEW.provider_org_id,
      'request_review',
      now() + INTERVAL '48 hours'
    );

    -- Schedule 30-day rebook reminder
    INSERT INTO public.follow_up_actions (
      booking_id,
      homeowner_id,
      provider_org_id,
      action_type,
      scheduled_for
    ) VALUES (
      NEW.id,
      NEW.homeowner_profile_id,
      NEW.provider_org_id,
      'rebook_service',
      now() + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix sync_booking_payment_status
CREATE OR REPLACE FUNCTION public.sync_booking_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- When payment status changes to 'paid', confirm booking
  IF NEW.status = 'paid' AND NEW.job_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'confirmed',
        payment_captured = TRUE,
        updated_at = NOW()
    WHERE id = NEW.job_id
    AND status != 'canceled'; -- Don't override cancellations
  END IF;
  
  -- When payment is refunded, update booking
  IF NEW.status = 'refunded' AND NEW.job_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'canceled',
        cancellation_reason = 'Payment refunded',
        updated_at = NOW()
    WHERE id = NEW.job_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_conversation_last_message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- Fix update_conversation_preview
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
