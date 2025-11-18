-- Phase 8: Security Hardening - Fix search_path on all functions

-- Fix search_path for all public functions that are missing it
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_beta_access(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.initialize_provider_metrics() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_org_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_exists() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation_preview() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_admin_invite(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_accept_invite(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_admin_invite(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_id_by_email(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_in_trial(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_notification_preferences() SET search_path = public, pg_temp;
ALTER FUNCTION public.schedule_followup_on_booking_completion() SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_service_credit(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_client_limit() SET search_path = public, pg_temp;
ALTER FUNCTION public.match_providers(text, uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_referral_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_team_seat_limit() SET search_path = public, pg_temp;
ALTER FUNCTION public.send_message(uuid, uuid, text, text, jsonb, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_booking_payment_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_client_lifetime_value() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_job_completion(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_referral_count(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.reset_unread_count(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_client_last_contact() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_client_on_subscription() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_create_booking(uuid, uuid, text, text, timestamp with time zone, timestamp with time zone, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.payments_kpis(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_payment_on_booking_completion() SET search_path = public, pg_temp;
ALTER FUNCTION public.can_complete_job(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.track_job_completion() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_provider_availability(uuid, timestamp with time zone, timestamp with time zone) SET search_path = public, pg_temp;

-- Create audit log table for critical actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);

-- Function to log critical actions
CREATE OR REPLACE FUNCTION log_audit(
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    organization_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    (SELECT id FROM organizations WHERE owner_id = auth.uid() LIMIT 1),
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;