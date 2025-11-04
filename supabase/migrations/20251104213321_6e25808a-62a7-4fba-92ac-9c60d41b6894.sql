-- Add payout notification preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS payout_email BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payout_inapp BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payout_push BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS weekly_digest_enabled BOOLEAN DEFAULT TRUE;

-- Create weekly digest tracking table
CREATE TABLE IF NOT EXISTS weekly_digest_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  total_payouts integer DEFAULT 0,
  total_amount_cents integer DEFAULT 0,
  sent_at timestamp with time zone DEFAULT now(),
  email_status text DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_weekly_digest_logs_user_id ON weekly_digest_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digest_logs_week_start ON weekly_digest_logs(week_start);

-- Enable RLS
ALTER TABLE weekly_digest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own digest logs"
  ON weekly_digest_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage digest logs"
  ON weekly_digest_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');