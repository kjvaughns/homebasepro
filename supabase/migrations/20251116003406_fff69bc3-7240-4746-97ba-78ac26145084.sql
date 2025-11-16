-- Phase 1 & 6: Make homeowner_profile_id nullable and add client_id
ALTER TABLE bookings 
ALTER COLUMN homeowner_profile_id DROP NOT NULL;

-- Add direct client reference
ALTER TABLE bookings 
ADD COLUMN client_id uuid REFERENCES clients(id);

-- Add index for better query performance
CREATE INDEX idx_bookings_client_id ON bookings(client_id);

-- Backfill client_id for existing bookings
UPDATE bookings b
SET client_id = c.id
FROM clients c
WHERE c.homeowner_profile_id = b.homeowner_profile_id
AND c.organization_id = b.provider_org_id
AND b.client_id IS NULL;

-- Phase 4: Add automation settings to organizations
ALTER TABLE organizations 
ADD COLUMN ai_automation_settings jsonb DEFAULT '{
  "quote_followups": true,
  "payment_reminders": true,
  "review_requests": true,
  "appointment_reminders": true
}'::jsonb;

-- Add phone index to clients for optimization
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Phase 8: Create trigger function for email notifications
CREATE OR REPLACE FUNCTION notify_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_client_email text;
  v_provider_org_id uuid;
  v_notification_type text;
BEGIN
  -- Determine notification type
  IF TG_OP = 'INSERT' THEN
    v_notification_type := 'job_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    v_notification_type := CASE 
      WHEN NEW.status = 'confirmed' THEN 'job_confirmed'
      WHEN NEW.status = 'completed' THEN 'job_completed'
      WHEN NEW.status = 'cancelled' THEN 'job_cancelled'
      ELSE 'job_updated'
    END;
  ELSE
    RETURN NEW;
  END IF;

  -- Get client email and provider org id
  SELECT c.email, NEW.provider_org_id 
  INTO v_client_email, v_provider_org_id
  FROM clients c
  WHERE c.id = NEW.client_id;

  -- Only proceed if we have a client email
  IF v_client_email IS NOT NULL THEN
    -- Call edge function via pg_net
    PERFORM
      net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-job-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'bookingId', NEW.id,
          'type', v_notification_type,
          'clientEmail', v_client_email,
          'providerOrgId', v_provider_org_id
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS on_job_change ON bookings;
CREATE TRIGGER on_job_change
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION notify_job_status_change();