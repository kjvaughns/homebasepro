-- Add RLS policy for stripe_events table
-- Only allow admins to view stripe events (no provider_org_id column exists)

CREATE POLICY "Admins can view all stripe events"
ON stripe_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);